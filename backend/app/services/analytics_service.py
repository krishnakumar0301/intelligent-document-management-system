"""Dashboard and analytics aggregations."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.activity import ActivityLog
from app.models.file_record import FileRecord


async def get_dashboard_stats(db: AsyncSession, user_id: int) -> dict:
    base = select(FileRecord).where(
        FileRecord.user_id == user_id,
        FileRecord.is_deleted == False,  # noqa: E712
    )

    count_r = await db.execute(select(func.count()).select_from(base.subquery()))
    total_files = count_r.scalar() or 0

    size_r = await db.execute(
        select(func.sum(FileRecord.size_bytes)).where(
            FileRecord.user_id == user_id,
            FileRecord.is_deleted == False,  # noqa: E712
        )
    )
    total_size = int(size_r.scalar() or 0)

    deleted_r = await db.execute(
        select(func.count()).where(
            FileRecord.user_id == user_id,
            FileRecord.is_deleted == True,  # noqa: E712
        )
    )
    deleted_count = deleted_r.scalar() or 0

    cat_r = await db.execute(
        select(FileRecord.category, func.count())
        .where(FileRecord.user_id == user_id, FileRecord.is_deleted == False)  # noqa: E712
        .group_by(FileRecord.category)
    )
    categories = {row[0] or "other": row[1] for row in cat_r.all()}

    ext_r = await db.execute(
        select(FileRecord.extension, func.count())
        .where(FileRecord.user_id == user_id, FileRecord.is_deleted == False)  # noqa: E712
        .group_by(FileRecord.extension)
    )
    extensions = {row[0] or "none": row[1] for row in ext_r.all()}

    # Duplicate groups count (hashes with count > 1)
    hash_r = await db.execute(
        select(FileRecord.file_hash, func.count())
        .where(
            FileRecord.user_id == user_id,
            FileRecord.is_deleted == False,  # noqa: E712
            FileRecord.file_hash.isnot(None),
        )
        .group_by(FileRecord.file_hash)
        .having(func.count() > 1)
    )
    duplicate_groups = len(hash_r.all())

    return {
        "total_files": total_files,
        "total_size_bytes": total_size,
        "storage_used_mb": round(total_size / (1024 * 1024), 2),
        "deleted_count": deleted_count,
        "duplicate_groups": duplicate_groups,
        "categories": categories,
        "extensions": extensions,
    }


async def get_full_analytics(db: AsyncSession, user_id: int) -> dict:
    largest_r = await db.execute(
        select(FileRecord).options(selectinload(FileRecord.tags))
        .where(FileRecord.user_id == user_id, FileRecord.is_deleted == False)  # noqa: E712
        .order_by(FileRecord.size_bytes.desc())
        .limit(10)
    )
    largest = list(largest_r.scalars().all())

    recent_r = await db.execute(
        select(FileRecord).options(selectinload(FileRecord.tags))
        .where(FileRecord.user_id == user_id, FileRecord.is_deleted == False)  # noqa: E712
        .order_by(FileRecord.modified_at.desc())
        .limit(10)
    )
    recent = list(recent_r.scalars().all())

    type_r = await db.execute(
        select(FileRecord.category, func.count())
        .where(FileRecord.user_id == user_id, FileRecord.is_deleted == False)  # noqa: E712
        .group_by(FileRecord.category)
    )
    type_distribution = {row[0] or "other": row[1] for row in type_r.all()}

    storage_r = await db.execute(
        select(FileRecord.category, func.sum(FileRecord.size_bytes))
        .where(FileRecord.user_id == user_id, FileRecord.is_deleted == False)  # noqa: E712
        .group_by(FileRecord.category)
    )
    storage_by_category = {row[0] or "other": int(row[1] or 0) for row in storage_r.all()}

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    act_r = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user_id, ActivityLog.created_at >= week_ago)
        .order_by(ActivityLog.created_at.desc())
        .limit(20)
    )
    recent_activity = [
        {
            "action": a.action,
            "details": a.details,
            "created_at": a.created_at.isoformat(),
        }
        for a in act_r.scalars().all()
    ]

    return {
        "largest_files": largest,
        "recent_files": recent,
        "type_distribution": type_distribution,
        "storage_by_category": storage_by_category,
        "recent_activity": recent_activity,
    }


async def get_recommendations(db: AsyncSession, user_id: int) -> list:
    stats = await get_dashboard_stats(db, user_id)
    recs = []

    if stats["duplicate_groups"] > 0:
        recs.append({
            "title": "Clean up duplicates",
            "description": f"You have {stats['duplicate_groups']} duplicate groups wasting space.",
            "action": "duplicates",
            "priority": "high",
        })

    if stats["storage_used_mb"] > 1024:
        recs.append({
            "title": "Review large files",
            "description": "Storage exceeds 1 GB — check your largest files.",
            "action": "analytics",
            "priority": "medium",
        })

    if stats["total_files"] == 0:
        recs.append({
            "title": "Scan your first folder",
            "description": "Index files to unlock search, organization, and AI features.",
            "action": "organizer",
            "priority": "high",
        })

    return recs
