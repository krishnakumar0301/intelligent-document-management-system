from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class FileRecordOut(BaseModel):
    id: int
    name: str
    path: str
    extension: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    size_bytes: int
    file_hash: Optional[str] = None
    mime_type: Optional[str] = None
    description: Optional[str] = None
    ocr_text: Optional[str] = None
    extracted_text: Optional[str] = None
    ai_tags: List[str] = []
    ai_confidence_score: Optional[float] = None
    is_deleted: bool
    is_favorite: bool
    modified_at: Optional[datetime] = None
    created_at: datetime
    tags: List[str] = []

    model_config = {"from_attributes": True}


class CategoryInfo(BaseModel):
    category: str
    subcategories: List[str]
    count: int = 0


class ReclassifyResponse(BaseModel):
    reclassified: int
    details: List[dict]


class FileListResponse(BaseModel):
    items: List[FileRecordOut]
    total: int
    page: int
    page_size: int


class ScanRequest(BaseModel):
    path: str = Field(..., min_length=1)
    organize: bool = False
    run_ocr: bool = False


class ScanResponse(BaseModel):
    scanned: int
    added: int
    updated: int
    organized: int
    message: str


class OrganizeRequest(BaseModel):
    path: str
    dry_run: bool = False


class DuplicateGroup(BaseModel):
    hash: str
    files: List[FileRecordOut]
    total_size: int
    wasted_bytes: int


class DuplicateResponse(BaseModel):
    groups: List[DuplicateGroup]
    total_groups: int
    total_wasted_bytes: int


class DeleteDuplicatesRequest(BaseModel):
    file_ids: List[int]
    keep_id: Optional[int] = None


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    category: Optional[str] = None
    extension: Optional[str] = None
    min_size: Optional[int] = None
    max_size: Optional[int] = None
    page: int = 1
    page_size: int = 20


class SearchResult(BaseModel):
    items: List[FileRecordOut]
    total: int
    query: str
    interpreted: Optional[str] = None


class TagRequest(BaseModel):
    tags: List[str]


class BulkRenameRequest(BaseModel):
    file_ids: List[int]
    pattern: str  # e.g. "{name}_{index}"
    start_index: int = 1


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str
    related_files: List[FileRecordOut] = []


class ChatHistoryItem(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ActivityOut(BaseModel):
    id: int
    action: str
    details: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class OrganizationRuleIn(BaseModel):
    name: str
    extension_pattern: Optional[str] = None
    category: Optional[str] = None
    target_folder: str
    is_active: bool = True


class OrganizationRuleOut(OrganizationRuleIn):
    id: int

    model_config = {"from_attributes": True}
