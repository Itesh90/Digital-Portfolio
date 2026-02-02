"""
Pydantic Schemas Package
"""

from app.schemas.user import (
    UserCreate,
    UserResponse,
    UserLogin,
    TokenResponse,
)
from app.schemas.resume import (
    ResumeResponse,
    ResumeUploadResponse,
    ParsedResumeData,
    InferredRole,
    CANONICAL_RESUME_SCHEMA,
)
from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioResponse,
    PortfolioBlueprint,
    SectionEditRequest,
)
from app.schemas.design import (
    DesignConfig,
    DESIGN_PRIMITIVES,
)

__all__ = [
    # User
    "UserCreate",
    "UserResponse", 
    "UserLogin",
    "TokenResponse",
    # Resume
    "ResumeResponse",
    "ResumeUploadResponse",
    "ParsedResumeData",
    "InferredRole",
    "CANONICAL_RESUME_SCHEMA",
    # Portfolio
    "PortfolioCreate",
    "PortfolioResponse",
    "PortfolioBlueprint",
    "SectionEditRequest",
    # Design
    "DesignConfig",
    "DESIGN_PRIMITIVES",
]
