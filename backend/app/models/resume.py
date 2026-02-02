"""
Resume Model

Stores uploaded resume files and their parsed JSON data.
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any, Dict

from sqlalchemy import String, DateTime, ForeignKey, Text, Uuid, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.portfolio import Portfolio


class ResumeStatus(str, Enum):
    """Resume processing status."""
    PENDING = "pending"
    PARSING = "parsing"
    PARSED = "parsed"
    VALIDATED = "validated"
    FAILED = "failed"


class Resume(Base):
    """Resume storage model."""
    
    __tablename__ = "resumes"
    
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
    original_filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    file_url: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    file_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    parsed_data: Mapped[Dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )
    inferred_role: Mapped[Dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )
    raw_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    status: Mapped[ResumeStatus] = mapped_column(
        SQLEnum(ResumeStatus),
        default=ResumeStatus.PENDING,
        nullable=False,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    
    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="resumes",
    )
    portfolios: Mapped[list["Portfolio"]] = relationship(
        "Portfolio",
        back_populates="resume",
    )
    
    def __repr__(self) -> str:
        return f"<Resume {self.original_filename}>"
