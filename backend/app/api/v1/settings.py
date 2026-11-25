"""User settings and organization rules."""

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.organization_rule import OrganizationRule
from app.models.settings_model import UserSettings
from app.schemas.file import OrganizationRuleIn, OrganizationRuleOut
from app.schemas.settings import UserSettingsOut, UserSettingsUpdate
from app.services.watcher import watcher_manager

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=UserSettingsOut)
async def get_settings(user: CurrentUser, db: DbSession):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        await db.flush()
    return settings


@router.patch("", response_model=UserSettingsOut)
async def update_settings(data: UserSettingsUpdate, user: CurrentUser, db: DbSession):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    await db.flush()

    # Restart watcher if path changed
    if settings.watcher_enabled and settings.scan_path:
        watcher_manager.start(user.id, settings.scan_path, lambda *_: None)

    return settings


@router.get("/rules", response_model=list[OrganizationRuleOut])
async def list_rules(user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(OrganizationRule).where(OrganizationRule.user_id == user.id)
    )
    return list(result.scalars().all())


@router.post("/rules", response_model=OrganizationRuleOut)
async def create_rule(data: OrganizationRuleIn, user: CurrentUser, db: DbSession):
    rule = OrganizationRule(user_id=user.id, **data.model_dump())
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: int, user: CurrentUser, db: DbSession):
    result = await db.execute(
        select(OrganizationRule).where(
            OrganizationRule.id == rule_id,
            OrganizationRule.user_id == user.id,
        )
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    await db.delete(rule)
    await db.flush()
    return {"deleted": True}
