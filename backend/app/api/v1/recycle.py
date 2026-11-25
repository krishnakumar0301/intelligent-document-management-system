"""Recycle bin: soft delete, restore, permanent delete."""

import os

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.file_record import FileRecord
from app.schemas.file import FileListResponse, FileRecordOut
from app.services.activity_service import log_activity

router = APIRouter(prefix="/recycle", tags=["Recycle Bin"])


@router.get("", response_model=FileListResponse)
async def list_recycle(user: CurrentUser, db: DbSession, page: int = 1, page_size: int = 20):
    result = await db.execute(
        select(FileRecord).options(selectinload(FileRecord.tags)).where(
            FileRecord.user_id == user.id,
            FileRecord.is_deleted == True,  # noqa: E712
        )
    )
    all_files = list(result.scalars().all())
    total = len(all_files)
    start = (page - 1) * page_size
    items = []
    for f in all_files[start : start + page_size]:
        items.append(FileRecordOut(
            id=f.id, name=f.name, path=f.path, extension=f.extension,
            category=f.category, size_bytes=f.size_bytes, file_hash=f.file_hash,
            mime_type=f.mime_type, description=f.description,
            is_deleted=f.is_deleted, is_favorite=f.is_favorite,
            modified_at=f.modified_at, created_at=f.created_at,
            tags=[t.tag for t in f.tags],
        ))
    return FileListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/{file_id}/restore")
async def restore_file(file_id: int, user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(FileRecord).where(
            FileRecord.id == file_id,
            FileRecord.user_id == user.id,
            FileRecord.is_deleted == True,  # noqa: E712
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="File not in recycle bin")
    record.is_deleted = False
    await log_activity(db, user.id, "restore", f"Restored {record.name}")
    await db.flush()
    await db.refresh(record)
    return FileRecordOut(
        id=record.id, name=record.name, path=record.path, extension=record.extension,
        category=record.category, size_bytes=record.size_bytes, file_hash=record.file_hash,
        mime_type=record.mime_type, description=record.description,
        is_deleted=record.is_deleted, is_favorite=record.is_favorite,
        modified_at=record.modified_at, created_at=record.created_at,
        tags=[t.tag for t in record.tags],
    )


@router.delete("/{file_id}")
async def soft_delete(file_id: int, user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(FileRecord).where(FileRecord.id == file_id, FileRecord.user_id == user.id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    record.is_deleted = True
    await log_activity(db, user.id, "soft_delete", f"Deleted {record.name}")
    await db.flush()
    return {"deleted": True}


@router.delete("/{file_id}/permanent")
async def permanent_delete(file_id: int, user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(FileRecord).where(
            FileRecord.id == file_id,
            FileRecord.user_id == user.id,
            FileRecord.is_deleted == True,  # noqa: E712
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="File not in recycle bin")
    if os.path.isfile(record.path):
        try:
            os.remove(record.path)
        except OSError:
            pass
    await db.delete(record)
    await log_activity(db, user.id, "permanent_delete", f"Permanently removed {record.name}")
    await db.flush()
    return {"removed": True}
