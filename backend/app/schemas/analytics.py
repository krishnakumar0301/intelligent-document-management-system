from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel

from app.schemas.file import FileRecordOut


class DashboardStats(BaseModel):
    total_files: int
    total_size_bytes: int
    storage_used_mb: float
    deleted_count: int
    duplicate_groups: int
    categories: Dict[str, int]
    extensions: Dict[str, int]


class AnalyticsResponse(BaseModel):
    largest_files: List[FileRecordOut]
    recent_files: List[FileRecordOut]
    type_distribution: Dict[str, int]
    storage_by_category: Dict[str, int]
    recent_activity: List[dict]


class Recommendation(BaseModel):
    title: str
    description: str
    action: str
    priority: str
