"""
Portfolio API Routes

Handles portfolio creation, editing, and management.
"""

from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.resume import Resume, ResumeStatus
from app.models.portfolio import Portfolio, PortfolioVersion, PortfolioStatus
from app.models.user import User
from app.api.auth import get_current_user
from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioResponse,
    PortfolioBlueprint,
    SectionEditRequest,
    SectionEditResponse,
    ATSCheckResult,
    PortfolioVersionResponse,
)
from app.schemas.design import DesignConfig, DesignSelectionRequest, DesignIntent
from app.services.ai_service import AIService
from app.services.ats_validator import ATSValidatorService

router = APIRouter()

# Dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("/", response_model=PortfolioResponse, status_code=status.HTTP_201_CREATED)
async def create_portfolio(
    data: PortfolioCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Create a new portfolio from a validated resume.
    
    The resume must be in VALIDATED status before portfolio creation.
    """
    # Get and validate resume
    result = await db.execute(
        select(Resume).where(
            Resume.id == data.resume_id,
            Resume.user_id == current_user.id
        )
    )
    resume = result.scalar_one_or_none()
    
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found"
        )
    
    if resume.status != ResumeStatus.VALIDATED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume must be validated before creating a portfolio"
        )
    
    # Generate portfolio name from resume data
    name = data.name
    if not name and resume.parsed_data:
        personal = resume.parsed_data.get("personal", {})
        name = f"{personal.get('name', 'My')} Portfolio"
    name = name or "Untitled Portfolio"
    
    # Create portfolio
    portfolio = Portfolio(
        user_id=current_user.id,
        resume_id=resume.id,
        name=name,
        status=PortfolioStatus.DRAFT,
    )
    db.add(portfolio)
    await db.flush()
    await db.refresh(portfolio)
    
    return portfolio


@router.get("/", response_model=List[PortfolioResponse])
async def list_portfolios(current_user: CurrentUser, db: DbSession):
    """
    List all portfolios for the current user.
    """
    result = await db.execute(
        select(Portfolio)
        .where(Portfolio.user_id == current_user.id)
        .order_by(Portfolio.updated_at.desc())
    )
    portfolios = result.scalars().all()
    return portfolios


@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(portfolio_id: UUID, current_user: CurrentUser, db: DbSession):
    """
    Get a specific portfolio by ID.
    """
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.resume))
        .where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    return portfolio


@router.post("/{portfolio_id}/blueprint", response_model=PortfolioResponse)
async def generate_blueprint(
    portfolio_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Generate a portfolio blueprint using AI.
    
    The blueprint defines page structure, section priority, tone, and content length.
    """
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.resume))
        .where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    if not portfolio.resume:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Portfolio must have a resume"
        )
    
    # For text-prompt flow, parsed_data may be empty {}
    # We only reject if parsed_data is None (never parsed)
    if portfolio.resume.parsed_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume must be parsed before generating blueprint"
        )
    
    # Generate blueprint using AI
    ai_service = AIService()
    blueprint_data = await ai_service.generate_blueprint(
        resume_data=portfolio.resume.parsed_data,
        inferred_role=portfolio.resume.inferred_role,
    )
    
    # Validate blueprint
    blueprint = PortfolioBlueprint.model_validate(blueprint_data)
    portfolio.blueprint = blueprint.model_dump()
    
    # Generate initial content
    content = await ai_service.generate_portfolio_content(
        resume_data=portfolio.resume.parsed_data,
        blueprint=blueprint.model_dump(),
    )
    portfolio.content = content
    
    await db.flush()
    await db.refresh(portfolio)
    
    return portfolio


@router.patch("/{portfolio_id}/design", response_model=PortfolioResponse)
async def update_design(
    portfolio_id: UUID,
    config: DesignConfig,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Update portfolio design configuration.
    
    Design config must use predefined primitives only.
    """
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Update design config
    portfolio.design_config = config.model_dump()
    
    await db.flush()
    await db.refresh(portfolio)
    
    return portfolio


@router.post("/{portfolio_id}/design/suggest", response_model=DesignConfig)
async def suggest_design(
    portfolio_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Get AI-suggested design configuration based on role and purpose.
    """
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.resume))
        .where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    if not portfolio.resume or not portfolio.resume.inferred_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume must be parsed with inferred role"
        )
    
    # Get AI suggestion
    ai_service = AIService()
    suggestion = await ai_service.suggest_design(portfolio.resume.inferred_role)
    
    return DesignConfig.model_validate(suggestion)


@router.post("/{portfolio_id}/design/intent", response_model=PortfolioResponse)
async def apply_design_intent(
    portfolio_id: UUID,
    intent: Annotated[DesignIntent, "Design Intent from Onboarding"],
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Apply design configuration based on user intent (density, personality, color).
    """
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Map intent to specific config
    config = intent.map_to_config()
    portfolio.design_config = config.model_dump()
    
    await db.flush()
    await db.refresh(portfolio)
    
    return portfolio


@router.patch("/{portfolio_id}/sections/{section_type}", response_model=SectionEditResponse)
async def edit_section(
    portfolio_id: UUID,
    section_type: str,
    request: SectionEditRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Edit a specific section using AI assistance.
    
    AI operates ONLY within the specified section scope.
    It cannot modify other sections or invent new information.
    """
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    if section_type != request.section_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Section type mismatch"
        )
    
    # Save version before editing
    await save_portfolio_version(portfolio, db)
    
    # Edit section using AI
    ai_service = AIService()
    updated_content = await ai_service.edit_section(
        section_type=request.section_type,
        current_content=request.current_content,
        instruction=request.instruction,
    )
    
    # Update portfolio content
    if portfolio.content is None:
        portfolio.content = {}
    portfolio.content[section_type] = updated_content
    
    await db.flush()
    
    return SectionEditResponse(
        section_type=section_type,
        updated_content=updated_content,
        changes_made=["Content updated per user instruction"],
    )


@router.post("/{portfolio_id}/ats-check", response_model=ATSCheckResult)
async def check_ats_compatibility(
    portfolio_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Run ATS compatibility check on portfolio content.
    
    Checks keyword coverage, bullet clarity, readability, and section completeness.
    """
    result = await db.execute(
        select(Portfolio)
        .options(selectinload(Portfolio.resume))
        .where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    if not portfolio.content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Portfolio has no content to check"
        )
    
    # Run ATS validation
    ats_service = ATSValidatorService()
    result = await ats_service.validate(
        content=portfolio.content,
        resume_data=portfolio.resume.parsed_data if portfolio.resume else None,
    )
    
    return result


@router.get("/{portfolio_id}/versions", response_model=List[PortfolioVersionResponse])
async def list_versions(
    portfolio_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    List all versions of a portfolio.
    """
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    result = await db.execute(
        select(PortfolioVersion)
        .where(PortfolioVersion.portfolio_id == portfolio_id)
        .order_by(PortfolioVersion.version_number.desc())
    )
    versions = result.scalars().all()
    
    return versions


@router.post("/{portfolio_id}/restore/{version_id}", response_model=PortfolioResponse)
async def restore_version(
    portfolio_id: UUID,
    version_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Restore a portfolio to a previous version.
    """
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    result = await db.execute(
        select(PortfolioVersion).where(
            PortfolioVersion.id == version_id,
            PortfolioVersion.portfolio_id == portfolio_id
        )
    )
    version = result.scalar_one_or_none()
    
    if not version:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Version not found"
        )
    
    # Save current state before restore
    await save_portfolio_version(portfolio, db)
    
    # Restore from version
    portfolio.content = version.content
    portfolio.design_config = version.design_config
    
    await db.flush()
    await db.refresh(portfolio)
    
    return portfolio


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_portfolio(
    portfolio_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Delete a portfolio and all its versions.
    """
    result = await db.execute(
        select(Portfolio).where(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        )
    )
    portfolio = result.scalar_one_or_none()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    await db.delete(portfolio)


async def save_portfolio_version(portfolio: Portfolio, db: AsyncSession) -> None:
    """Save current portfolio state as a version."""
    if not portfolio.content:
        return
    
    # Get latest version number
    result = await db.execute(
        select(PortfolioVersion)
        .where(PortfolioVersion.portfolio_id == portfolio.id)
        .order_by(PortfolioVersion.version_number.desc())
        .limit(1)
    )
    latest = result.scalar_one_or_none()
    next_version = (latest.version_number + 1) if latest else 1
    
    # Create version
    version = PortfolioVersion(
        portfolio_id=portfolio.id,
        version_number=next_version,
        content=portfolio.content,
        design_config=portfolio.design_config or {},
    )
    db.add(version)
    await db.flush()
