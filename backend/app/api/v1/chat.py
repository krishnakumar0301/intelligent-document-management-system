"""AI chat assistant."""

from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import CurrentUser, DbSession
from app.models.chat import ChatMessage
from app.schemas.file import ChatHistoryItem, ChatRequest, ChatResponse, FileRecordOut
from app.services.ai_chat import generate_chat_response

router = APIRouter(prefix="/chat", tags=["AI Chat"])


@router.post("", response_model=ChatResponse)
async def chat(data: ChatRequest, user: CurrentUser, db: DbSession):
    db.add(ChatMessage(user_id=user.id, role="user", content=data.message))
    reply, related = await generate_chat_response(db, user.id, data.message)
    db.add(ChatMessage(user_id=user.id, role="assistant", content=reply))
    await db.flush()

    related_out = []
    for f in related:
        related_out.append(FileRecordOut(
            id=f.id,
            name=f.name,
            path=f.path,
            extension=f.extension,
            category=f.category,
            size_bytes=f.size_bytes,
            file_hash=f.file_hash,
            mime_type=f.mime_type,
            description=f.description,
            is_deleted=f.is_deleted,
            is_favorite=f.is_favorite,
            modified_at=f.modified_at,
            created_at=f.created_at,
            tags=[t.tag for t in f.tags],
        ))
    return ChatResponse(
        reply=reply,
        related_files=related_out,
    )


@router.get("/history", response_model=list[ChatHistoryItem])
async def chat_history(user: CurrentUser, db: DbSession, limit: int = 50):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    messages = list(result.scalars().all())
    messages.reverse()
    return messages


@router.delete("/history")
async def clear_history(user: CurrentUser, db: DbSession):
    result = await db.execute(select(ChatMessage).where(ChatMessage.user_id == user.id))
    for msg in result.scalars().all():
        await db.delete(msg)
    await db.flush()
    return {"cleared": True}
