from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.user import Base


class SyncConflict(Base):
    __tablename__ = "sync_conflicts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    operation: Mapped[str] = mapped_column(String(20), nullable=False)
    base_sync_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    client_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    server_version: Mapped[int] = mapped_column(Integer, nullable=False)
    client_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    server_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="open", nullable=False)
    resolution_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    resolution_mode: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
