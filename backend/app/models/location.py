import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.user import Base


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type_id: Mapped[str | None] = mapped_column(
        ForeignKey("location_types.id", ondelete="SET NULL"), nullable=True
    )
    city: Mapped[str] = mapped_column(String(255), default="")
    country: Mapped[str] = mapped_column(String(10), default="")
    link: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    visited_unknown_year: Mapped[bool] = mapped_column(Boolean, default=False)
    sync_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    location_type: Mapped["LocationType | None"] = relationship(  # noqa: F821
        back_populates="locations", lazy="selectin"
    )
    visits: Mapped[list["LocationVisit"]] = relationship(
        back_populates="location", cascade="all, delete-orphan", lazy="selectin"
    )
    tags: Mapped[list["LocationTag"]] = relationship(
        back_populates="location", cascade="all, delete-orphan", lazy="selectin"
    )


class LocationVisit(Base):
    __tablename__ = "location_visits"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    location_id: Mapped[str] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    year: Mapped[int] = mapped_column(Integer, nullable=False)

    location: Mapped["Location"] = relationship(back_populates="visits")

    __table_args__ = (
        # unique on (location_id, year) enforced by index
    )


class LocationTag(Base):
    __tablename__ = "location_tags"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    location_id: Mapped[str] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
    tag: Mapped[str] = mapped_column(String(100), nullable=False)

    location: Mapped["Location"] = relationship(back_populates="tags")

    __table_args__ = (
        # unique on (location_id, tag) enforced by index
    )


# Forward reference resolved via location_type module
from app.models.location_type import LocationType  # noqa: E402, F401
