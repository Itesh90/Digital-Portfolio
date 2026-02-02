"""
Portfolio Model

Stores generated portfolio data with versioning support.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any, Dict

from sqlalchemy import String, DateTime, ForeignKey, Integer, Uuid, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.resume import Resume
    from app.models.published_site import PublishedSite


class PortfolioStatus(str, Enum):
    """Portfolio status."""
    DRAFT = "draft"
    PUBLISHED = "published"


class Portfolio(Base):
    """Portfolio model."""
    
    __tablename__ = "portfolios"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("resumes.id", ondelete="SET NULL"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    blueprint: Mapped[Dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )
    content: Mapped[Dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )
    design_config: Mapped[Dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )
    status: Mapped[PortfolioStatus] = mapped_column(
        SQLEnum(PortfolioStatus),
        default=PortfolioStatus.DRAFT,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
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
    user: Mapped["User"] = relationship(
        "User",
        back_populates="portfolios",
    )
    resume: Mapped["Resume"] = relationship(
        "Resume",
        back_populates="portfolios",
    )
    versions: Mapped[list["PortfolioVersion"]] = relationship(
        "PortfolioVersion",
        back_populates="portfolio",
        cascade="all, delete-orphan",
        order_by="desc(PortfolioVersion.version_number)",
    )
    published_site: Mapped["PublishedSite | None"] = relationship(
        "PublishedSite",
        back_populates="portfolio",
        uselist=False,
    )
    
    def __repr__(self) -> str:
        return f"<Portfolio {self.name}>"


class PortfolioVersion(Base):
    """Portfolio version for history tracking."""
    
    __tablename__ = "portfolio_versions"
    
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
    )
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("portfolios.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    content: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
    )
    design_config: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    portfolio: Mapped["Portfolio"] = relationship(
        "Portfolio",
        back_populates="versions",
    )
    
    def __repr__(self) -> str:
        return f"<PortfolioVersion {self.portfolio_id}:v{self.version_number}>"
