"""
Publishing API Routes

Handles portfolio publishing and static site generation.
"""

from typing import Annotated
from uuid import UUID
import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.portfolio import Portfolio, PortfolioStatus
from app.models.published_site import PublishedSite
from app.models.user import User, PlanTier
from app.api.auth import get_current_user
from app.schemas.portfolio import PublishRequest, PublishResponse
from app.services.static_site_builder import StaticSiteBuilder

router = APIRouter()

# Dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]

# Subdomain validation
SUBDOMAIN_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
RESERVED_SUBDOMAINS = {"www", "api", "admin", "app", "dashboard", "static", "cdn"}


def validate_subdomain(subdomain: str) -> None:
    """Validate subdomain format and availability."""
    if len(subdomain) < 3 or len(subdomain) > 63:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain must be between 3 and 63 characters"
        )
    
    if not SUBDOMAIN_PATTERN.match(subdomain):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain must contain only lowercase letters, numbers, and hyphens"
        )
    
    if subdomain in RESERVED_SUBDOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This subdomain is reserved"
        )


@router.post("/{portfolio_id}", response_model=PublishResponse)
async def publish_portfolio(
    portfolio_id: UUID,
    request: PublishRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Publish a portfolio to a static site.
    
    Free tier users have limited publishing options.
    Pro tier users can use custom domains.
    """
    # Validate subdomain
    validate_subdomain(request.subdomain)
    
    # Check if subdomain is already taken
    result = await db.execute(
        select(PublishedSite).where(PublishedSite.subdomain == request.subdomain)
    )
    existing = result.scalar_one_or_none()
    if existing and existing.portfolio.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subdomain is already taken"
        )
    
    # Get portfolio
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
            detail="Portfolio has no content to publish"
        )
    
    # Check plan limits for custom domain
    if request.custom_domain and current_user.plan == PlanTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Custom domains require a Pro subscription"
        )
    
    # Build static site
    builder = StaticSiteBuilder()
    static_url = await builder.build_and_deploy(
        portfolio=portfolio,
        subdomain=request.subdomain,
    )
    
    # Create or update published site record
    result = await db.execute(
        select(PublishedSite).where(PublishedSite.portfolio_id == portfolio_id)
    )
    published = result.scalar_one_or_none()
    
    if published:
        published.subdomain = request.subdomain
        published.custom_domain = request.custom_domain
        published.static_url = static_url
        published.is_active = True
    else:
        published = PublishedSite(
            portfolio_id=portfolio.id,
            subdomain=request.subdomain,
            custom_domain=request.custom_domain,
            static_url=static_url,
            is_active=True,
        )
        db.add(published)
    
    # Update portfolio status
    portfolio.status = PortfolioStatus.PUBLISHED
    
    await db.flush()
    await db.refresh(published)
    
    return PublishResponse(
        portfolio_id=portfolio.id,
        subdomain=request.subdomain,
        url=f"https://{request.subdomain}.portfoliobuilder.app",
        custom_domain=request.custom_domain,
        published_at=published.published_at,
    )


@router.post("/{portfolio_id}/unpublish", status_code=status.HTTP_204_NO_CONTENT)
async def unpublish_portfolio(
    portfolio_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Unpublish a portfolio, making it inaccessible.
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
        select(PublishedSite).where(PublishedSite.portfolio_id == portfolio_id)
    )
    published = result.scalar_one_or_none()
    
    if published:
        published.is_active = False
    
    portfolio.status = PortfolioStatus.DRAFT
    
    await db.flush()


@router.get("/{portfolio_id}/preview")
async def get_preview(
    portfolio_id: UUID,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Get HTML preview of the portfolio.
    
    Returns rendered HTML that can be displayed in an iframe.
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
            detail="Portfolio has no content to preview"
        )
    
    # Generate preview HTML
    builder = StaticSiteBuilder()
    html = await builder.render_preview(portfolio)
    
    return {"html": html}
