"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1 import (
    activity,
    analytics,
    auth,
    chat,
    duplicates,
    files,
    recycle,
    scan,
    search,
    settings,
    users,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(files.router)
api_router.include_router(scan.router)
api_router.include_router(duplicates.router)
api_router.include_router(search.router)
api_router.include_router(chat.router)
api_router.include_router(analytics.router)
api_router.include_router(recycle.router)
api_router.include_router(settings.router)
api_router.include_router(activity.router)
