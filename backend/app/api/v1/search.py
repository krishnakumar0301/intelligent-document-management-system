"""Semantic / natural language search."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.file import FileRecordOut, SearchRequest, SearchResult
from app.services.semantic_search import semantic_search

router = APIRouter(prefix="/search", tags=["Search"])


@router.post("", response_model=SearchResult)
async def search_files(data: SearchRequest, user: CurrentUser, db: DbSession):
    result = await semantic_search(
        db,
        user.id,
        data.query,
        category=data.category,
        extension=data.extension,
        min_size=data.min_size,
        max_size=data.max_size,
        page=data.page,
        page_size=data.page_size,
    )
    items = []
    for f in result["items"]:
        items.append(FileRecordOut(
            id=f.id,
            name=f.name,
            path=f.path,
            extension=f.extension,
            category=f.category,
            subcategory=f.subcategory,
            size_bytes=f.size_bytes,
            file_hash=f.file_hash,
            mime_type=f.mime_type,
            description=f.description,
            extracted_text=f.extracted_text,
            ai_tags=f.ai_tags or [],
            ai_confidence_score=f.ai_confidence_score,
            ocr_text=f.ocr_text,
            is_deleted=f.is_deleted,
            is_favorite=f.is_favorite,
            modified_at=f.modified_at,
            created_at=f.created_at,
            tags=[t.tag for t in f.tags],
        ))
    return SearchResult(
        items=items,
        total=result["total"],
        query=result["query"],
        interpreted=result.get("interpreted"),
    )
