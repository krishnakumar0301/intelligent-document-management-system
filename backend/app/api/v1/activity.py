"""Activity log endpoints."""

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.activity import ActivityLog
from app.schemas.file import ActivityOut

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("", response_model=list[ActivityOut])
async def list_activity(user: CurrentUser, db: DbSession, limit: int = 50):
    result = await db.execute(
        select(ActivityLog)
        .where(ActivityLog.user_id == user.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
