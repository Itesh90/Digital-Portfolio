"""
Resume API Routes

Handles resume upload, parsing, and validation.
"""

from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.resume import Resume, ResumeStatus
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.resume import (
    ResumeResponse,
    ResumeUploadResponse,
    ResumeConfirmRequest,
    ParsedResumeData,
)
from app.services.resume_parser import ResumeParserService
from app.services.ai_service import AIService

router = APIRouter()

# Dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]

# Allowed file types
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_file(file: UploadFile) -> None:
    """Validate uploaded file type and size."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    # Check extension
    ext = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )


@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: Annotated[UploadFile, File(description="Resume file (PDF, DOCX, or TXT)")],
    current_user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
):
    """
    Upload a resume file for processing.
    
    Supports PDF, DOCX, and TXT formats.
    Maximum file size: 10MB.
    
    The file will be stored and queued for AI parsing.
    """
    validate_file(file)
    
    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Get file extension
    ext = "." + file.filename.split(".")[-1].lower()
    
    # Create resume record
    resume = Resume(
        user_id=current_user.id,
        original_filename=file.filename,
        file_url="",  # Will be updated after storage
        file_type=ext,
        status=ResumeStatus.PENDING,
    )
    db.add(resume)
    await db.flush()
    await db.refresh(resume)
    
    # Save file to disk
    import os
    upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, f"{resume.id}{ext}")
    with open(file_path, "wb") as f:
        f.write(content)
    
    resume.file_url = file_path  # Store actual file path
    
    return ResumeUploadResponse(
        id=resume.id,
        filename=file.filename,
        status=resume.status.value,
        message="Resume uploaded successfully. Processing will begin shortly."
    )


@router.post("/empty", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def create_empty_resume(
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Create an empty resume record for 'Build from Scratch' flow.
    Empty resumes are auto-validated since they don't need parsing.
    """
    resume = Resume(
        user_id=current_user.id,
        original_filename="manual_entry.txt",
        file_url="",
        file_type=".txt",
        status=ResumeStatus.VALIDATED,  # Auto-validated for portfolio creation
        parsed_data={},  # Empty data to be filled manually
    )
    db.add(resume)
    await db.flush()
    await db.refresh(resume)
    
    return ResumeUploadResponse(
        id=resume.id,
        filename="Manual Entry",
        status=resume.status.value,
        message="Empty resume created and ready for portfolio creation."
    )


@router.get("/", response_model=List[ResumeResponse])
async def list_resumes(current_user: CurrentUser, db: DbSession):
    """
    List all resumes for the current user.
    """
    result = await db.execute(
        select(Resume)
        .where(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
    )
    resumes = result.scalars().all()
    return resumes


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(resume_id: UUID, current_user: CurrentUser, db: DbSession):
    """
    Get a specific resume by ID.
    """
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    return resume


@router.post("/{resume_id}/parse", response_model=ResumeResponse)
async def parse_resume(
    resume_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Trigger AI parsing for a resume.
    
    Extracts structured data from the resume and validates against
    the canonical schema.
    """
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    if resume.status == ResumeStatus.PARSING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume is already being parsed"
        )
    
    # Update status
    resume.status = ResumeStatus.PARSING
    await db.flush()
    
    try:
        # Parse resume using AI service
        parser = ResumeParserService()
        ai_service = AIService()
        
        # Step 1: Extract text from file
        try:
            raw_text = await parser.extract_text(resume.file_url, resume.file_type)
            resume.raw_text = raw_text
            if not raw_text or len(raw_text.strip()) < 50:
                raise ValueError(f"Extracted text too short or empty: {len(raw_text) if raw_text else 0} chars")
        except Exception as extract_err:
            raise ValueError(f"Text extraction failed: {str(extract_err)}")
        
        # Step 2: Parse with AI
        try:
            parsed_data = await ai_service.parse_resume(raw_text)
        except Exception as ai_err:
            raise ValueError(f"AI parsing failed: {str(ai_err)}")
        
        # Step 3: Validate against canonical schema
        try:
            validated_data = ParsedResumeData.model_validate(parsed_data)
            resume.parsed_data = validated_data.model_dump()
        except Exception as validate_err:
            # Store raw data even if validation fails
            resume.parsed_data = parsed_data
            print(f"Validation warning: {validate_err}")
        
        # Step 4: Infer role and intent
        try:
            inferred_role = await ai_service.infer_role(resume.parsed_data)
            resume.inferred_role = inferred_role
        except Exception as role_err:
            print(f"Role inference warning: {role_err}")
            resume.inferred_role = {"primary_role": "Professional"}
        
        resume.status = ResumeStatus.PARSED
        
    except Exception as e:
        resume.status = ResumeStatus.FAILED
        resume.error_message = str(e)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse resume: {str(e)}"
        )
    
    await db.commit()
    await db.refresh(resume)
    return resume


@router.post("/{resume_id}/validate", response_model=ResumeResponse)
async def validate_resume(resume_id: UUID, current_user: CurrentUser, db: DbSession):
    """
    Validate parsed resume data against the canonical schema.
    """
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    if not resume.parsed_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume has not been parsed yet"
        )
    
    try:
        # Validate against canonical schema
        ParsedResumeData.model_validate(resume.parsed_data)
        resume.status = ResumeStatus.VALIDATED
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Schema validation failed: {str(e)}"
        )
    
    await db.refresh(resume)
    return resume


@router.post("/{resume_id}/confirm", response_model=ResumeResponse)
async def confirm_resume(
    resume_id: UUID,
    data: ResumeConfirmRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Confirm (and optionally edit) parsed resume data before portfolio generation.
    
    This is the user's chance to correct any parsing errors.
    """
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    # Update with user-confirmed data
    resume.parsed_data = data.parsed_data.model_dump()
    if data.inferred_role:
        resume.inferred_role = data.inferred_role.model_dump()
    resume.status = ResumeStatus.VALIDATED
    
    await db.refresh(resume)
    return resume


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(resume_id: UUID, current_user: CurrentUser, db: DbSession):
    """
    Delete a resume and its associated data.
    """
    result = await db.execute(
        select(Resume).where(
            Resume.id == resume_id,
            Resume.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    await db.delete(resume)
