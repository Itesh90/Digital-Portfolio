"""
Resume Portfolio Builder - Main Application

FastAPI application entry point with middleware and route configuration.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db, close_db
from app.api import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown events."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


# Create FastAPI application
app = FastAPI(
    title="Resume Portfolio Builder API",
    description="""
    AI-powered Resume to Portfolio transformation platform.
    
    ## Features
    
    * **Resume Parsing**: Upload and extract structured data from resumes
    * **AI-Powered Generation**: Generate portfolio content using AI
    * **Design System**: Select from predefined design primitives
    * **ATS Validation**: Check portfolio for ATS compatibility
    * **Static Publishing**: Deploy portfolios as static sites
    
    ## Constraints
    
    * AI outputs JSON only
    * Resume schema is canonical and immutable
    * AI cannot invent information
    * Design uses predefined primitives only
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Check API health status."""
    return {"status": "healthy", "version": "1.0.0"}


# Include API routes
app.include_router(api_router, prefix="/api")


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle uncaught exceptions."""
    if settings.is_development:
        # Return detailed error in development
        return JSONResponse(
            status_code=500,
            content={
                "detail": str(exc),
                "type": type(exc).__name__,
            }
        )
    else:
        # Return generic error in production
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
