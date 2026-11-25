"""Authentication: register, login."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_, select

from app.api.deps import DbSession
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.settings_model import UserSettings
from app.models.user import User
from app.schemas.auth import Token, UserLogin, UserProfile, UserRegister

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: DbSession):
    existing = await db.execute(
        select(User).where((User.email == data.email) | (User.username == data.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already registered")

    user = User(
        email=data.email,
        username=data.username,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.flush()

    settings = UserSettings(user_id=user.id)
    db.add(settings)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(db: DbSession, form: OAuth2PasswordRequestForm = Depends()):
    # Accept either username or email in OAuth2 username field.
    result = await db.execute(
        select(User).where(
            or_(User.username == form.username, User.email == form.username)
        )
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")

    token = create_access_token(str(user.id))
    return Token(access_token=token)


@router.post("/login/json", response_model=Token)
async def login_json(data: UserLogin, db: DbSession):
    result = await db.execute(
        select(User).where(
            or_(User.username == data.username, User.email == data.username)
        )
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return Token(access_token=create_access_token(str(user.id)))
