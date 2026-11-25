"""User profile endpoints."""

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas.auth import UserProfile, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserProfile)
async def get_profile(user: CurrentUser):
    return user


@router.patch("/me", response_model=UserProfile)
async def update_profile(data: UserUpdate, user: CurrentUser, db: DbSession):
    if data.email and data.email != user.email:
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = data.email
    if data.full_name is not None:
        user.full_name = data.full_name
    await db.flush()
    await db.refresh(user)
    return user
