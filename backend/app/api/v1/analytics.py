"""Dashboard stats and analytics export."""

import io
from datetime import datetime

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.api.deps import CurrentUser, DbSession
from app.schemas.analytics import AnalyticsResponse, DashboardStats, Recommendation
from app.schemas.file import FileRecordOut
from app.services.analytics_service import get_dashboard_stats, get_full_analytics, get_recommendations
from app.utils.file_utils import format_size

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(user: CurrentUser, db: DbSession):
    return await get_dashboard_stats(db, user.id)


@router.get("/full", response_model=AnalyticsResponse)
async def full_analytics(user: CurrentUser, db: DbSession):
    data = await get_full_analytics(db, user.id)
    def to_out(f):
        return FileRecordOut(
            id=f.id, name=f.name, path=f.path, extension=f.extension,
            category=f.category, size_bytes=f.size_bytes, file_hash=f.file_hash,
            mime_type=f.mime_type, description=f.description,
            is_deleted=f.is_deleted, is_favorite=f.is_favorite,
            modified_at=f.modified_at, created_at=f.created_at,
            tags=[t.tag for t in f.tags],
        )
    return AnalyticsResponse(
        largest_files=[to_out(f) for f in data["largest_files"]],
        recent_files=[to_out(f) for f in data["recent_files"]],
        type_distribution=data["type_distribution"],
        storage_by_category=data["storage_by_category"],
        recent_activity=data["recent_activity"],
    )


@router.get("/recommendations", response_model=list[Recommendation])
async def recommendations(user: CurrentUser, db: DbSession):
    return await get_recommendations(db, user.id)


@router.get("/export/pdf")
async def export_pdf(user: CurrentUser, db: DbSession):
    stats = await get_dashboard_stats(db, user.id)
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, "FileOracle Analytics Report")
    c.setFont("Helvetica", 11)
    y = 720
    lines = [
        f"Generated: {datetime.utcnow().isoformat()} UTC",
        f"User: {user.username}",
        f"Total files: {stats['total_files']}",
        f"Storage used: {format_size(stats['total_size_bytes'])}",
        f"Duplicate groups: {stats['duplicate_groups']}",
        "",
        "Category distribution:",
    ]
    for cat, count in stats["categories"].items():
        lines.append(f"  - {cat}: {count}")
    for line in lines:
        c.drawString(50, y, line)
        y -= 18
    c.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=fileoracle-report.pdf"},
    )
