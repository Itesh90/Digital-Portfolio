"""
API Routes Package
"""

from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.resume import router as resume_router
from app.api.portfolio import router as portfolio_router
from app.api.publish import router as publish_router
from app.api.build import router as build_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(resume_router, prefix="/resumes", tags=["Resumes"])
api_router.include_router(portfolio_router, prefix="/portfolios", tags=["Portfolios"])
api_router.include_router(publish_router, prefix="/publish", tags=["Publishing"])
api_router.include_router(build_router, prefix="/build", tags=["Build Pipeline"])

