"""Log user actions for audit trail."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity import ActivityLog


async def log_activity(
    db: AsyncSession,
    user_id: int,
    action: str,
    details: str | None = None,
) -> ActivityLog:
    entry = ActivityLog(user_id=user_id, action=action, details=details)
    db.add(entry)
    await db.flush()
    return entry
