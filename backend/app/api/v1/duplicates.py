"""Duplicate detection and cleanup."""

import os

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DbSession
from app.models.file_record import FileRecord
from app.schemas.file import DeleteDuplicatesRequest, DuplicateGroup, DuplicateResponse, FileRecordOut
from app.services.activity_service import log_activity
from app.services.duplicate_detector import find_duplicates
from sqlalchemy import select

router = APIRouter(prefix="/duplicates", tags=["Duplicates"])


@router.get("", response_model=DuplicateResponse)
async def list_duplicates(user: CurrentUser, db: DbSession):
    result = await find_duplicates(db, user.id)
    def to_out(f):
        return FileRecordOut(
            id=f.id, name=f.name, path=f.path, extension=f.extension,
            category=f.category, size_bytes=f.size_bytes, file_hash=f.file_hash,
            mime_type=f.mime_type, description=f.description,
            is_deleted=f.is_deleted, is_favorite=f.is_favorite,
            modified_at=f.modified_at, created_at=f.created_at,
            tags=[t.tag for t in f.tags],
        )
    groups = []
    for g in result["groups"]:
        groups.append(
            DuplicateGroup(
                hash=g["hash"],
                files=[to_out(f) for f in g["files"]],
                total_size=g["total_size"],
                wasted_bytes=g["wasted_bytes"],
            )
        )
    return DuplicateResponse(
        groups=groups,
        total_groups=result["total_groups"],
        total_wasted_bytes=result["total_wasted_bytes"],
    )


@router.post("/delete")
async def delete_duplicates(data: DeleteDuplicatesRequest, user: CurrentUser, db: DbSession):
    deleted = []
    for fid in data.file_ids:
        if data.keep_id and fid == data.keep_id:
            continue
        result = await db.execute(
            select(FileRecord).where(FileRecord.id == fid, FileRecord.user_id == user.id)
        )
        record = result.scalar_one_or_none()
        if not record:
            continue
        # Soft delete to recycle bin
        record.is_deleted = True
        deleted.append(record.id)

    await log_activity(db, user.id, "delete_duplicates", f"Moved {len(deleted)} duplicates to recycle bin")
    await db.flush()
    return {"deleted_ids": deleted, "count": len(deleted)}


@router.delete("/permanent")
async def permanent_delete(file_ids: list[int], user: CurrentUser, db: DbSession):
    removed = []
    for fid in file_ids:
        result = await db.execute(
            select(FileRecord).where(
                FileRecord.id == fid,
                FileRecord.user_id == user.id,
                FileRecord.is_deleted == True,  # noqa: E712
            )
        )
        record = result.scalar_one_or_none()
        if not record:
            continue
        if os.path.isfile(record.path):
            try:
                os.remove(record.path)
            except OSError:
                pass
        await db.delete(record)
        removed.append(fid)

    await log_activity(db, user.id, "permanent_delete", f"Permanently deleted {len(removed)} files")
    await db.flush()
    return {"removed": removed}
