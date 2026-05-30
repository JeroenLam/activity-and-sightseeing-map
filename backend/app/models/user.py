import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(2), default="en")
    default_map_lat: Mapped[float | None] = mapped_column(nullable=True)
    default_map_lng: Mapped[float | None] = mapped_column(nullable=True)
    default_map_zoom: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )

    oauth_providers: Mapped[list["OAuthProvider"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", lazy="selectin"
    )
    visibility_settings: Mapped["UserVisibilitySettings | None"] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )


class OAuthProvider(Base):
    __tablename__ = "oauth_providers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    provider_id: Mapped[str] = mapped_column(String(255), nullable=False)

    user: Mapped["User"] = relationship(back_populates="oauth_providers")

    __table_args__ = (
        # UniqueConstraint handled by index
    )


class UserVisibilitySettings(Base):
    __tablename__ = "user_visibility_settings"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    profile_public: Mapped[bool] = mapped_column(Boolean, default=False)
    location_filter: Mapped[str] = mapped_column(String(20), default="show-all")
    show_ratings: Mapped[bool] = mapped_column(Boolean, default=True)
    show_comments: Mapped[bool] = mapped_column(Boolean, default=True)

    user: Mapped["User"] = relationship(back_populates="visibility_settings")
