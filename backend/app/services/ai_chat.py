"""Rule-based AI assistant for file queries (local, no external API)."""

import re
from typing import List, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.file_record import FileRecord
from app.services.duplicate_detector import find_duplicates
from app.services.semantic_search import semantic_search
from app.utils.file_utils import format_size


async def generate_chat_response(
    db: AsyncSession,
    user_id: int,
    message: str,
) -> Tuple[str, List[FileRecord]]:
    """Parse user message and return helpful response + related files."""
    msg = message.lower().strip()
    related: List[FileRecord] = []

    # Where are my PDFs?
    if re.search(r"where.*pdf|find.*pdf|my pdf", msg):
        result = await db.execute(
            select(FileRecord).options(selectinload(FileRecord.tags)).where(
                FileRecord.user_id == user_id,
                FileRecord.is_deleted == False,  # noqa: E712
                FileRecord.extension == ".pdf",
            ).limit(10)
        )
        related = list(result.scalars().all())
        if related:
            paths = "\n".join(f"• {f.name} — {f.path}" for f in related[:5])
            more = f"\n...and {len(related) - 5} more." if len(related) > 5 else ""
            return f"I found {len(related)} PDF file(s):\n{paths}{more}", related
        return "I couldn't find any PDF files in your indexed library. Try scanning a folder first.", []

    # Largest files
    if re.search(r"largest|biggest|huge|most space", msg):
        result = await db.execute(
            select(FileRecord).options(selectinload(FileRecord.tags))
            .where(FileRecord.user_id == user_id, FileRecord.is_deleted == False)  # noqa: E712
            .order_by(FileRecord.size_bytes.desc())
            .limit(10)
        )
        related = list(result.scalars().all())
        if related:
            lines = "\n".join(
                f"• {f.name} — {format_size(f.size_bytes)}" for f in related
            )
            return f"Here are your largest files:\n{lines}", related
        return "No files indexed yet. Scan a folder from the Organizer page.", []

    # Duplicates
    if re.search(r"duplicate", msg):
        dup = await find_duplicates(db, user_id)
        groups = dup["groups"][:5]
        for g in groups:
            related.extend(g["files"][:3])
        if dup["total_groups"]:
            wasted = format_size(dup["total_wasted_bytes"])
            return (
                f"You have {dup['total_groups']} duplicate group(s), "
                f"wasting about {wasted}. Check the Duplicates page to clean up."
            ), related
        return "No duplicate files detected. Great job keeping things tidy!", []

    # Storage / count
    if re.search(r"how many|total files|storage|disk", msg):
        count_r = await db.execute(
            select(func.count(FileRecord.id)).where(
                FileRecord.user_id == user_id,
                FileRecord.is_deleted == False,  # noqa: E712
            )
        )
        count = count_r.scalar() or 0
        size_r = await db.execute(
            select(func.sum(FileRecord.size_bytes)).where(
                FileRecord.user_id == user_id,
                FileRecord.is_deleted == False,  # noqa: E712
            )
        )
        total_size = size_r.scalar() or 0
        return (
            f"You have {count} indexed files using approximately {format_size(int(total_size))}."
        ), []

    # Generic semantic search
    search = await semantic_search(db, user_id, message, page_size=8)
    related = search["items"]
    if related:
        names = ", ".join(f.name for f in related[:5])
        interp = search.get("interpreted") or "matching your query"
        return f"Found {search['total']} file(s) ({interp}): {names}", related

    return (
        "I can help you find files, show largest items, locate PDFs, or check duplicates. "
        "Try: 'Where are my PDFs?', 'Show largest files', or 'Find duplicate images'."
    ), []
