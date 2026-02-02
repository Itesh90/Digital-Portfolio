"""
Published Site Model

Tracks deployed portfolio sites with subdomain/custom domain support.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, DateTime, ForeignKey, Boolean, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.portfolio import Portfolio


class PublishedSite(Base):
    """Published portfolio site model."""
    
    __tablename__ = "published_sites"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("portfolios.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    subdomain: Mapped[str] = mapped_column(
        String(63),
        unique=True,
        index=True,
        nullable=False,
    )
    custom_domain: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        nullable=True,
    )
    static_url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    published_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    portfolio: Mapped["Portfolio"] = relationship(
        "Portfolio",
        back_populates="published_site",
    )
    
    def __repr__(self) -> str:
        return f"<PublishedSite {self.subdomain}>"
