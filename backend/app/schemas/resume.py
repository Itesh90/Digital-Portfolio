"""
Resume Schemas

Canonical resume schema definition and related Pydantic models.
This schema is LOCKED and immutable - all AI outputs must validate against it.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# CANONICAL RESUME SCHEMA (IMMUTABLE)
# =============================================================================

class PersonalInfo(BaseModel):
    """Personal/contact information section."""
    
    name: str = ""
    headline: str = ""
    location: str = ""
    email: str = ""
    links: List[str] = Field(default_factory=list)


class ExperienceItem(BaseModel):
    """Single work experience entry."""
    
    role: str = ""
    company: str = ""
    duration: str = ""
    bullets: List[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    """Single project entry."""
    
    name: str = ""
    description: str = ""
    tech: List[str] = Field(default_factory=list)
    link: str = ""


class EducationItem(BaseModel):
    """Single education entry."""
    
    institution: str = ""
    degree: str = ""
    field: str = ""
    duration: str = ""


class ParsedResumeData(BaseModel):
    """
    CANONICAL RESUME SCHEMA
    
    This is the LOCKED schema that all AI outputs must validate against.
    Changes to this schema require explicit approval and migration.
    """
    
    personal: PersonalInfo = Field(default_factory=PersonalInfo)
    summary: str = ""
    experience: List[ExperienceItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    
    @field_validator("skills", "achievements", mode="before")
    @classmethod
    def ensure_list(cls, v: Any) -> List[str]:
        """Ensure skills and achievements are always lists."""
        if v is None:
            return []
        if isinstance(v, str):
            return [v]
        return list(v)


# JSON Schema for validation and AI prompts
CANONICAL_RESUME_SCHEMA = {
    "type": "object",
    "properties": {
        "personal": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "headline": {"type": "string"},
                "location": {"type": "string"},
                "email": {"type": "string"},
                "links": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["name", "headline", "location", "email", "links"]
        },
        "summary": {"type": "string"},
        "experience": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "role": {"type": "string"},
                    "company": {"type": "string"},
                    "duration": {"type": "string"},
                    "bullets": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["role", "company", "duration", "bullets"]
            }
        },
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "tech": {"type": "array", "items": {"type": "string"}},
                    "link": {"type": "string"}
                },
                "required": ["name", "description", "tech", "link"]
            }
        },
        "skills": {"type": "array", "items": {"type": "string"}},
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "institution": {"type": "string"},
                    "degree": {"type": "string"},
                    "field": {"type": "string"},
                    "duration": {"type": "string"}
                }
            }
        },
        "achievements": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["personal", "summary", "experience", "projects", "skills", "education", "achievements"]
}


# =============================================================================
# INFERRED ROLE SCHEMA
# =============================================================================

class InferredRole(BaseModel):
    """AI-inferred role and intent from resume."""
    
    primary_role: str = Field(..., description="Extracted job title or role category")
    seniority: str = Field(
        ..., 
        pattern="^(junior|mid|senior|lead|executive)$",
        description="Career level"
    )
    portfolio_purpose: str = Field(
        ...,
        pattern="^(job_search|freelance|consulting|showcase)$",
        description="Inferred portfolio intent"
    )


# =============================================================================
# API RESPONSE SCHEMAS
# =============================================================================

class ResumeUploadResponse(BaseModel):
    """Response after resume upload."""
    
    id: UUID
    filename: str
    status: str
    message: str


class ResumeResponse(BaseModel):
    """Full resume response with parsed data."""
    
    id: UUID
    original_filename: str
    status: str
    parsed_data: Optional[ParsedResumeData] = None
    inferred_role: Optional[InferredRole] = None
    created_at: datetime
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class ResumeConfirmRequest(BaseModel):
    """Request to confirm/edit parsed data before portfolio generation."""
    
    parsed_data: ParsedResumeData
    inferred_role: Optional[InferredRole] = None
