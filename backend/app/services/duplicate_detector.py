"""Hash-based duplicate file detection."""

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.file_record import FileRecord


async def find_duplicates(db: AsyncSession, user_id: int) -> dict:
    """Group files by SHA-256 hash."""
    result = await db.execute(
        select(FileRecord).options(selectinload(FileRecord.tags)).where(
            FileRecord.user_id == user_id,
            FileRecord.is_deleted == False,  # noqa: E712
            FileRecord.file_hash.isnot(None),
        )
    )
    files = list(result.scalars().all())

    by_hash: dict[str, list[FileRecord]] = defaultdict(list)
    for f in files:
        if f.file_hash:
            by_hash[f.file_hash].append(f)

    groups = []
    total_wasted = 0

    for h, group in by_hash.items():
        if len(group) < 2:
            continue
        size = group[0].size_bytes
        wasted = size * (len(group) - 1)
        total_wasted += wasted
        groups.append({
            "hash": h,
            "files": group,
            "total_size": size * len(group),
            "wasted_bytes": wasted,
        })

    groups.sort(key=lambda g: g["wasted_bytes"], reverse=True)
    return {"groups": groups, "total_groups": len(groups), "total_wasted_bytes": total_wasted}
