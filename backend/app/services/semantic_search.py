"""Lightweight semantic / natural-language file search using TF-IDF."""

import logging
import re
from typing import Any, Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.file_record import FileRecord

logger = logging.getLogger(__name__)

# Natural language patterns -> structured filters
NL_PATTERNS = [
    (r"\bpython\b|\b\.py\b", {"extension": ".py", "interpreted": "Python source files"}),
    (r"\bjavascript\b|\b\.js\b", {"extension": ".js", "interpreted": "JavaScript files"}),
    (r"\bimage(s)?\b|\bphoto(s)?\b|\bpicture(s)?\b", {"category": "images", "interpreted": "Image files"}),
    (r"\bvideo(s)?\b|\bmovie(s)?\b", {"category": "videos", "interpreted": "Video files"}),
    (r"\bdocument(s)?\b|\bpdf(s)?\b", {"category": "documents", "interpreted": "Documents"}),
    (r"\baudio\b|\bmusic\b", {"category": "audio", "interpreted": "Audio files"}),
    (r"\barchive(s)?\b|\bzip(s)?\b", {"category": "archives", "interpreted": "Archive files"}),
    (r"\bcode\b|\bsource\b", {"category": "code", "interpreted": "Source code files"}),
    (r"\brecent\b|\blatest\b|\bnewest\b", {"sort": "modified_desc", "interpreted": "Recently modified files"}),
    (r"\blarge(st)?\b|\bbig(ger)?\b|\bhuge\b", {"sort": "size_desc", "interpreted": "Largest files"}),
    (r"\bsmall(est)?\b|\btiny\b", {"sort": "size_asc", "interpreted": "Smallest files"}),
    (r"\bduplicate(s)?\b", {"special": "duplicates", "interpreted": "Duplicate files"}),
]


def parse_natural_query(query: str) -> dict[str, Any]:
    q = query.lower().strip()
    filters: dict[str, Any] = {"interpreted": None, "sort": None, "special": None}

    for pattern, mapping in NL_PATTERNS:
        if re.search(pattern, q):
            filters.update(mapping)
            break

    # Extract size hints like "large videos"
    if "mb" in q or "gb" in q:
        m = re.search(r"(\d+)\s*(mb|gb)", q)
        if m:
            val = int(m.group(1))
            unit = m.group(2)
            filters["min_size"] = val * (1024**2 if unit == "mb" else 1024**3)

    filters["raw_query"] = query
    return filters


def _build_corpus(files: list[FileRecord]) -> list[str]:
    docs = []
    for f in files:
        tags_str = " ".join(f.ai_tags or [])
        parts = [f.name, f.path, f.category or "", f.subcategory or "", f.extension or "", f.description or "", f.ocr_text or "", f.extracted_text or "", tags_str]
        docs.append(" ".join(p for p in parts if p))
    return docs


async def semantic_search(
    db: AsyncSession,
    user_id: int,
    query: str,
    category: Optional[str] = None,
    extension: Optional[str] = None,
    min_size: Optional[int] = None,
    max_size: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    parsed = parse_natural_query(query)
    interpreted = parsed.get("interpreted")

    cat = category or parsed.get("category")
    ext = extension or parsed.get("extension")
    min_sz = min_size or parsed.get("min_size")
    max_sz = max_size

    stmt = (
        select(FileRecord)
        .options(selectinload(FileRecord.tags))
        .where(
            FileRecord.user_id == user_id,
            FileRecord.is_deleted == False,  # noqa: E712
        )
    )

    if cat:
        stmt = stmt.where(FileRecord.category == cat)
    if ext:
        stmt = stmt.where(FileRecord.extension == ext)
    if min_sz:
        stmt = stmt.where(FileRecord.size_bytes >= min_sz)
    if max_sz:
        stmt = stmt.where(FileRecord.size_bytes <= max_sz)

    # Text match on name/path — only apply raw query when no NL filter was inferred
    # to avoid over-constraining (e.g. "python files" also ILIKE '%python files%')
    has_nl_filter = bool(parsed.get("category") or parsed.get("extension") or parsed.get("special"))
    if query.strip() and not has_nl_filter:
        like = f"%{query.strip()}%"
        stmt = stmt.where(
            or_(
                FileRecord.name.ilike(like),
                FileRecord.path.ilike(like),
                FileRecord.description.ilike(like),
                FileRecord.extracted_text.ilike(like),
                FileRecord.ai_tags.ilike(f'%"{query.strip()}"%'),
            )
        )

    result = await db.execute(stmt)
    files = list(result.scalars().all())

    # TF-IDF ranking when we have multiple candidates
    if len(files) > 1 and query.strip():
        try:
            corpus = _build_corpus(files)
            vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)
            matrix = vectorizer.fit_transform(corpus)
            q_vec = vectorizer.transform([query])
            scores = cosine_similarity(q_vec, matrix).flatten()
            ranked = sorted(zip(files, scores), key=lambda x: x[1], reverse=True)
            files = [f for f, s in ranked if s > 0 or not cat]
        except Exception as e:
            logger.debug("TF-IDF fallback: %s", e)

    sort_mode = parsed.get("sort")
    if sort_mode == "size_desc":
        files.sort(key=lambda f: f.size_bytes, reverse=True)
        interpreted = interpreted or "Sorted by size (largest first)"
    elif sort_mode == "size_asc":
        files.sort(key=lambda f: f.size_bytes)
    elif sort_mode == "modified_desc":
        files.sort(key=lambda f: f.modified_at or f.created_at, reverse=True)

    total = len(files)
    start = (page - 1) * page_size
    page_items = files[start : start + page_size]

    return {
        "items": page_items,
        "total": total,
        "query": query,
        "interpreted": interpreted,
    }
