"""Scan directories and index files into the database."""

import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file_record import FileRecord, FileTag
from app.services.activity_service import log_activity
from app.utils.file_utils import (
    categorize_file,
    compute_file_hash,
    get_extension,
    get_file_metadata,
)

logger = logging.getLogger(__name__)

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", ".idea"}


async def scan_directory(
    db: AsyncSession,
    user_id: int,
    scan_path: str,
    compute_hash: bool = True,
) -> dict:
    """Walk directory and upsert file records."""
    root = Path(scan_path)
    if not root.exists() or not root.is_dir():
        raise ValueError(f"Invalid scan path: {scan_path}")

    scanned = added = updated = 0

    for dirpath, dirnames, filenames in os.walk(scan_path):
        # Prune skipped directories
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith(".")]

        for filename in filenames:
            if filename.startswith("."):
                continue

            full_path = os.path.join(dirpath, filename)
            if not os.path.isfile(full_path):
                continue

            scanned += 1
            try:
                size, mtime, mime = get_file_metadata(full_path)
                ext = get_extension(filename)
                category = categorize_file(filename)
                file_hash = compute_file_hash(full_path) if compute_hash else None

                result = await db.execute(
                    select(FileRecord).where(
                        FileRecord.user_id == user_id,
                        FileRecord.path == full_path,
                    )
                )
                existing = result.scalar_one_or_none()

                if existing:
                    existing.size_bytes = size
                    existing.modified_at = mtime
                    existing.category = category
                    existing.extension = ext
                    existing.mime_type = mime
                    if file_hash:
                        existing.file_hash = file_hash
                    existing.indexed_at = datetime.now(timezone.utc)
                    updated += 1
                else:
                    record = FileRecord(
                        user_id=user_id,
                        name=filename,
                        path=full_path,
                        extension=ext,
                        category=category,
                        size_bytes=size,
                        file_hash=file_hash,
                        mime_type=mime,
                        modified_at=mtime,
                        indexed_at=datetime.now(timezone.utc),
                    )
                    db.add(record)
                    added += 1
            except OSError as e:
                logger.warning("Could not index %s: %s", full_path, e)

    await log_activity(
        db, user_id, "scan", f"Scanned {scanned} files at {scan_path}; +{added} new, {updated} updated"
    )
    await db.flush()

    return {"scanned": scanned, "added": added, "updated": updated}


async def get_file_with_tags(db: AsyncSession, record: FileRecord) -> FileRecord:
    result = await db.execute(select(FileTag).where(FileTag.file_id == record.id))
    tags = [t.tag for t in result.scalars().all()]
    record._tags_list = tags  # type: ignore
    return record
