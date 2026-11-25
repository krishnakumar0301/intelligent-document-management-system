"""Per-user application settings."""

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    theme: Mapped[str] = mapped_column(String(20), default="dark")
    scan_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    auto_organize: Mapped[bool] = mapped_column(Boolean, default=False)
    watcher_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    user = relationship("User", back_populates="settings")
