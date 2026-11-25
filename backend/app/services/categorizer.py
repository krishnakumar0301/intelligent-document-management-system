"""Auto-organize files into category/subcategory folders using AI classification."""

import logging
import os
import shutil
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file_record import FileRecord
from app.services.activity_service import log_activity
from app.services.ai_classifier import classify_file
from app.utils.file_utils import categorize_file as ext_categorize, get_extension

logger = logging.getLogger(__name__)


def get_storage_path(category: str, subcategory: str = None, base: Optional[Path] = None) -> Path:
    """Return the storage folder for a given category and subcategory.

    If *base* is provided, folders are created under it (user's chosen path).
    If omitted, defaults to ``backend/storage/`` (server-managed store).
    """
    root = (base or Path(__file__).resolve().parent.parent.parent / "storage").resolve()
    if category == "archives":
        base_dir = root / "Archives"
    elif category == "code":
        base_dir = root / "Code"
    elif category == "spreadsheets":
        base_dir = root / "Spreadsheets"
    else:
        base_dir = root / category.capitalize()
    if subcategory and subcategory != "Others":
        base_dir = base_dir / subcategory
    return base_dir


async def organize_files(
    db: AsyncSession,
    user_id: int,
    base_path: str,
    dry_run: bool = False,
    use_ai: bool = True,
) -> int:
    """Move files into category/subcategory folders under the scanned directory."""
    base = Path(base_path).resolve()
    if not base.is_dir():
        raise ValueError("Base path must be a directory")

    files_result = await db.execute(
        select(FileRecord).where(
            FileRecord.user_id == user_id,
            FileRecord.is_deleted == False,
            FileRecord.path.like(f"{base!s}%"),
        )
    )
    files = list(files_result.scalars().all())
    moved = 0

    for f in files:
        if not os.path.isfile(f.path):
            continue

        # Run AI classification
        if use_ai:
            result = classify_file(f.path, f.name)
            category = result["category"]
            subcategory = result["subcategory"]
            f.subcategory = subcategory
            f.ai_tags = result["ai_tags"]
            f.ai_confidence_score = result["confidence_score"]
            if result["extracted_text"]:
                f.extracted_text = result["extracted_text"]
        else:
            category = f.category or ext_categorize(f.name)
            subcategory = f.subcategory or "Others"

        f.category = category

        # Destination is a subfolder under the scanned directory
        dest_dir = get_storage_path(category, subcategory, base=base)
        dest_path = dest_dir / Path(f.path).name

        if Path(f.path).resolve() == dest_path.resolve():
            continue

        if dry_run:
            moved += 1
            continue

        try:
            dest_dir.mkdir(parents=True, exist_ok=True)
            shutil.move(f.path, str(dest_path))
            f.path = str(dest_path.resolve())
            f.name = dest_path.name
            moved += 1
        except OSError as e:
            logger.warning("Failed to move %s: %s", f.path, e)

    if not dry_run and moved:
        await log_activity(db, user_id, "organize", f"Organized {moved} files into structured folders under {base_path}")

    await db.flush()
    return moved
