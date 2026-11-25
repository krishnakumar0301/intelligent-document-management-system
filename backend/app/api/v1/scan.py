"""Folder scanning and organization."""

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, DbSession
from app.models.settings_model import UserSettings
from app.schemas.file import OrganizeRequest, ScanRequest, ScanResponse
from app.services.categorizer import organize_files
from app.services.file_scanner import scan_directory
from app.services.ocr_service import extract_text_from_file
from sqlalchemy import select

router = APIRouter(prefix="/scan", tags=["Scanner"])


@router.post("", response_model=ScanResponse)
async def scan_folder(data: ScanRequest, user: CurrentUser, db: DbSession):
    path = data.path.strip()
    if not path:
        raise HTTPException(status_code=400, detail="Path is required")

    try:
        stats = await scan_directory(db, user.id, path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    organized = 0
    if data.organize:
        organized = await organize_files(db, user.id, path, dry_run=False)

    if data.run_ocr:
        from app.models.file_record import FileRecord

        result = await db.execute(
            select(FileRecord).where(
                FileRecord.user_id == user.id,
                FileRecord.path.like(f"{path}%"),
                FileRecord.category == "images",
            ).limit(20)
        )
        for f in result.scalars().all():
            f.ocr_text = extract_text_from_file(f.path) or None

    return ScanResponse(
        scanned=stats["scanned"],
        added=stats["added"],
        updated=stats["updated"],
        organized=organized,
        message=f"Scan complete: {stats['added']} new, {stats['updated']} updated",
    )


@router.post("/organize")
async def organize(data: OrganizeRequest, user: CurrentUser, db: DbSession):
    try:
        count = await organize_files(db, user.id, data.path, dry_run=data.dry_run)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"organized": count, "dry_run": data.dry_run}
