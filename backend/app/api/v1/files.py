"""File CRUD, preview, upload, favorites, tags, bulk rename, AI classification."""

import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import aiofiles
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DbSession
from app.models.file_record import FileRecord, FileTag
from app.schemas.file import (
    BulkRenameRequest,
    CategoryInfo,
    FileListResponse,
    FileRecordOut,
    ReclassifyResponse,
    TagRequest,
)
from app.services.activity_service import log_activity
from app.services.ai_classifier import (
    CATEGORY_TREE,
    classify_file,
    get_all_categories,
    get_all_subcategories,
    get_subcategories,
)
from app.services.ocr_service import extract_text_from_file
from app.utils.file_utils import get_extension, validate_user_path

router = APIRouter(prefix="/files", tags=["Files"])


def _to_out(record: FileRecord, tags: Optional[List[str]] = None) -> FileRecordOut:
    return FileRecordOut(
        id=record.id,
        name=record.name,
        path=record.path,
        extension=record.extension,
        category=record.category,
        subcategory=record.subcategory,
        size_bytes=record.size_bytes,
        file_hash=record.file_hash,
        mime_type=record.mime_type,
        description=record.description,
        ocr_text=record.ocr_text,
        extracted_text=record.extracted_text,
        ai_tags=record.ai_tags or [],
        ai_confidence_score=record.ai_confidence_score,
        is_deleted=record.is_deleted,
        is_favorite=record.is_favorite,
        modified_at=record.modified_at,
        created_at=record.created_at,
        tags=tags or [],
    )


async def _get_tags(db: DbSession, file_id: int) -> List[str]:
    r = await db.execute(select(FileTag).where(FileTag.file_id == file_id))
    return [t.tag for t in r.scalars().all()]


# ── Category / Subcategory endpoints ────────────────────────────────────────


@router.get("/categories", response_model=List[CategoryInfo])
async def list_categories(user: CurrentUser, db: DbSession):
    """Return all categories with their subcategories and file counts."""
    result = []
    for cat, subs in get_all_subcategories().items():
        count_result = await db.execute(
            select(func.count(FileRecord.id)).where(
                FileRecord.user_id == user.id,
                FileRecord.is_deleted == False,
                FileRecord.category == cat,
            )
        )
        count = count_result.scalar() or 0
        result.append(CategoryInfo(category=cat, subcategories=subs, count=count))
    return result


@router.get("/category/{category}", response_model=FileListResponse)
async def list_by_category(
    category: str,
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List all files in a category."""
    stmt = select(FileRecord).where(
        FileRecord.user_id == user.id,
        FileRecord.is_deleted == False,
        FileRecord.category == category,
    )
    result = await db.execute(stmt)
    all_files = list(result.scalars().all())
    total = len(all_files)
    start = (page - 1) * page_size
    page_items = all_files[start : start + page_size]

    items = []
    for f in page_items:
        tags = await _get_tags(db, f.id)
        items.append(_to_out(f, tags))
    return FileListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/subcategory/{subcategory}", response_model=FileListResponse)
async def list_by_subcategory(
    subcategory: str,
    user: CurrentUser,
    db: DbSession,
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List all files in a subcategory, optionally filtered by category."""
    stmt = select(FileRecord).where(
        FileRecord.user_id == user.id,
        FileRecord.is_deleted == False,
        FileRecord.subcategory == subcategory,
    )
    if category:
        stmt = stmt.where(FileRecord.category == category)

    result = await db.execute(stmt)
    all_files = list(result.scalars().all())
    total = len(all_files)
    start = (page - 1) * page_size
    page_items = all_files[start : start + page_size]

    items = []
    for f in page_items:
        tags = await _get_tags(db, f.id)
        items.append(_to_out(f, tags))
    return FileListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/images", response_model=FileListResponse)
async def list_images(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return await list_by_category("images", user, db, page, page_size)


@router.get("/videos", response_model=FileListResponse)
async def list_videos(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return await list_by_category("videos", user, db, page, page_size)


@router.get("/audio", response_model=FileListResponse)
async def list_audio(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return await list_by_category("audio", user, db, page, page_size)


# ── Search by AI tags ───────────────────────────────────────────────────────


@router.get("/search", response_model=FileListResponse)
async def search_files(
    user: CurrentUser,
    db: DbSession,
    q: str = Query("", min_length=1),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Semantic + tag-based search across files."""
    from sqlalchemy import or_

    stmt = select(FileRecord).where(
        FileRecord.user_id == user.id,
        FileRecord.is_deleted == False,
    )

    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                FileRecord.name.ilike(like),
                FileRecord.ai_tags.ilike(f'%"{q}"%'),
                FileRecord.extracted_text.ilike(like),
                FileRecord.ocr_text.ilike(like),
                FileRecord.description.ilike(like),
            )
        )
    if category:
        stmt = stmt.where(FileRecord.category == category)
    if subcategory:
        stmt = stmt.where(FileRecord.subcategory == subcategory)

    sort_col = getattr(FileRecord, sort_by, FileRecord.created_at)
    stmt = stmt.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    result = await db.execute(stmt)
    all_files = list(result.scalars().all())
    total = len(all_files)
    start = (page - 1) * page_size
    page_items = all_files[start : start + page_size]

    items = []
    for f in page_items:
        tags = await _get_tags(db, f.id)
        items.append(_to_out(f, tags))
    return FileListResponse(items=items, total=total, page=page, page_size=page_size)


# ── Reclassify ──────────────────────────────────────────────────────────────


@router.post("/reclassify", response_model=ReclassifyResponse)
async def reclassify_files(
    user: CurrentUser,
    db: DbSession,
    file_ids: Optional[List[int]] = Query(None),
):
    """Re-run AI classification on files. If file_ids omitted, reclassify all."""
    stmt = select(FileRecord).where(
        FileRecord.user_id == user.id,
        FileRecord.is_deleted == False,
    )
    if file_ids:
        stmt = stmt.where(FileRecord.id.in_(file_ids))

    result = await db.execute(stmt)
    records = list(result.scalars().all())
    details = []

    for rec in records:
        try:
            classification = classify_file(rec.path, rec.name)
            old_cat = rec.category
            old_sub = rec.subcategory
            rec.category = classification["category"]
            rec.subcategory = classification["subcategory"]
            rec.ai_tags = classification["ai_tags"]
            rec.ai_confidence_score = classification["confidence_score"]
            if classification["extracted_text"]:
                rec.extracted_text = classification["extracted_text"]
            details.append({
                "file_id": rec.id,
                "name": rec.name,
                "old_category": old_cat,
                "new_category": rec.category,
                "old_subcategory": old_sub,
                "new_subcategory": rec.subcategory,
                "confidence": rec.ai_confidence_score,
            })
        except Exception as e:
            details.append({"file_id": rec.id, "name": rec.name, "error": str(e)})

    await log_activity(db, user.id, "reclassify", f"Reclassified {len(details)} files with AI")
    await db.flush()
    return ReclassifyResponse(reclassified=len(details), details=details)


# ── Existing CRUD endpoints ─────────────────────────────────────────────────


@router.get("", response_model=FileListResponse)
async def list_files(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    favorite_only: bool = False,
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
):
    stmt = select(FileRecord).where(
        FileRecord.user_id == user.id,
        FileRecord.is_deleted == False,
    )
    if category:
        stmt = stmt.where(FileRecord.category == category)
    if subcategory:
        stmt = stmt.where(FileRecord.subcategory == subcategory)
    if favorite_only:
        stmt = stmt.where(FileRecord.is_favorite == True)

    sort_col = getattr(FileRecord, sort_by, FileRecord.created_at)
    stmt = stmt.order_by(sort_col.desc() if sort_dir == "desc" else sort_col.asc())

    result = await db.execute(stmt)
    all_files = list(result.scalars().all())
    total = len(all_files)
    start = (page - 1) * page_size
    page_items = all_files[start : start + page_size]

    items = []
    for f in page_items:
        tags = await _get_tags(db, f.id)
        items.append(_to_out(f, tags))

    return FileListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{file_id}", response_model=FileRecordOut)
async def get_file(file_id: int, user: CurrentUser, db: DbSession):
    record = await _get_user_file(db, user.id, file_id)
    tags = await _get_tags(db, record.id)
    return _to_out(record, tags)


@router.get("/{file_id}/preview")
async def preview_file(file_id: int, user: CurrentUser, db: DbSession):
    record = await _get_user_file(db, user.id, file_id)
    if not os.path.isfile(record.path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(record.path, filename=record.name, media_type=record.mime_type)


@router.get("/{file_id}/metadata")
async def file_metadata(file_id: int, user: CurrentUser, db: DbSession):
    record = await _get_user_file(db, user.id, file_id)
    tags = await _get_tags(db, record.id)
    return {
        "file": _to_out(record, tags),
        "exists_on_disk": os.path.isfile(record.path),
    }


@router.post("/upload")
async def upload_files(
    user: CurrentUser,
    db: DbSession,
    destination: str = Query(..., description="Folder path to save uploads"),
    files: List[UploadFile] = File(...),
):
    """Upload files, run AI classification, and store organized under destination folder."""
    from app.services.ai_classifier import classify_file
    from app.utils.file_utils import compute_file_hash, get_file_metadata

    dest_root = Path(destination).resolve()
    dest_root.mkdir(parents=True, exist_ok=True)
    uploaded = []

    for upload in files:
        safe_name = Path(upload.filename or "unnamed").name
        file_bytes = await upload.read()

        # Run AI classification before storing
        classification = classify_file(safe_name, safe_name)

        # Organize under the user's chosen destination folder
        cat = classification["category"]
        sub = classification.get("subcategory") or "Others"
        if cat == "archives":
            dest_dir = dest_root / "Archives"
        elif cat == "code":
            dest_dir = dest_root / "Code"
        elif cat == "spreadsheets":
            dest_dir = dest_root / "Spreadsheets"
        else:
            dest_dir = dest_root / cat.capitalize()
        if sub and sub != "Others":
            dest_dir = dest_dir / sub

        dest_dir.mkdir(parents=True, exist_ok=True)
        target = dest_dir / safe_name

        # Write file to organized folder under user's destination
        async with aiofiles.open(target, "wb") as out:
            await out.write(file_bytes)

        size, mtime, mime = get_file_metadata(str(target))
        record = FileRecord(
            user_id=user.id,
            name=safe_name,
            path=str(target.resolve()),
            extension=get_extension(safe_name),
            category=classification["category"],
            subcategory=classification["subcategory"],
            size_bytes=size,
            file_hash=compute_file_hash(str(target)),
            mime_type=mime,
            ai_tags=classification["ai_tags"],
            ai_confidence_score=classification["confidence_score"],
            extracted_text=classification.get("extracted_text"),
            modified_at=mtime,
            indexed_at=datetime.now(timezone.utc),
        )
        db.add(record)
        uploaded.append({
            "name": safe_name,
            "path": str(target),
            "category": classification["category"],
            "subcategory": classification["subcategory"],
            "confidence": classification["confidence_score"],
            "tags": classification["ai_tags"],
        })

    await log_activity(db, user.id, "upload", f"Uploaded {len(uploaded)} file(s) with AI classification to {destination}")
    await db.flush()
    return {"uploaded": uploaded, "count": len(uploaded)}


@router.post("/{file_id}/favorite")
async def toggle_favorite(file_id: int, user: CurrentUser, db: DbSession):
    record = await _get_user_file(db, user.id, file_id)
    record.is_favorite = not record.is_favorite
    await db.flush()
    return {"is_favorite": record.is_favorite}


@router.put("/{file_id}/tags", response_model=FileRecordOut)
async def set_tags(file_id: int, data: TagRequest, user: CurrentUser, db: DbSession):
    record = await _get_user_file(db, user.id, file_id)
    await db.execute(delete(FileTag).where(FileTag.file_id == file_id))
    for tag in data.tags:
        db.add(FileTag(file_id=file_id, tag=tag.strip().lower()))
    await db.flush()
    tags = await _get_tags(db, file_id)
    return _to_out(record, tags)


@router.post("/bulk-rename")
async def bulk_rename(data: BulkRenameRequest, user: CurrentUser, db: DbSession):
    renamed = []
    for i, fid in enumerate(data.file_ids):
        record = await _get_user_file(db, user.id, fid)
        if not os.path.isfile(record.path):
            continue
        stem = Path(record.name).stem
        ext = Path(record.name).suffix
        idx = data.start_index + i
        new_name = data.pattern.replace("{name}", stem).replace("{index}", str(idx)) + ext
        new_path = str(Path(record.path).parent / new_name)
        os.rename(record.path, new_path)
        record.name = new_name
        record.path = new_path
        renamed.append(new_name)

    await log_activity(db, user.id, "bulk_rename", f"Renamed {len(renamed)} files")
    await db.flush()
    return {"renamed": renamed}


@router.post("/{file_id}/ocr")
async def run_ocr(file_id: int, user: CurrentUser, db: DbSession):
    record = await _get_user_file(db, user.id, file_id)
    text = extract_text_from_file(record.path)
    record.ocr_text = text or None
    await db.flush()
    return {"ocr_text": text, "success": bool(text)}


@router.patch("/{file_id}/subcategory")
async def update_subcategory(
    file_id: int,
    subcategory: str,
    user: CurrentUser,
    db: DbSession,
):
    """Manually update a file's subcategory (for recategorization)."""
    record = await _get_user_file(db, user.id, file_id)
    record.subcategory = subcategory
    await db.flush()
    return {"id": file_id, "subcategory": subcategory}


async def _get_user_file(db: DbSession, user_id: int, file_id: int) -> FileRecord:
    result = await db.execute(
        select(FileRecord).where(FileRecord.id == file_id, FileRecord.user_id == user_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    return record
