import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy import Integer
from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import UTC, datetime

from app.models.user import Base


class LocationType(Base):
    __tablename__ = "location_types"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    icon: Mapped[str] = mapped_column(String(100), default="")
    sync_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    locations: Mapped[list["Location"]] = relationship(  # noqa: F821
        back_populates="location_type"
    )
    type_visibility: Mapped[list["TypeVisibility"]] = relationship(
        back_populates="location_type", cascade="all, delete-orphan"
    )


class TypeVisibility(Base):
    __tablename__ = "type_visibility"

    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    type_id: Mapped[str] = mapped_column(
        ForeignKey("location_types.id", ondelete="CASCADE"), primary_key=True
    )
    public: Mapped[bool] = mapped_column(Boolean, default=True)

    location_type: Mapped["LocationType"] = relationship(
        back_populates="type_visibility"
    )


from app.models.location import Location  # noqa: E402, F401
