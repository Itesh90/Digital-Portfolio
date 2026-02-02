"""
Build API Routes

Endpoints for the portfolio build pipeline.
Includes WebSocket for real-time event streaming.
"""

import asyncio
import json
from typing import Annotated, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.api.auth import get_current_user
from app.services.build_orchestrator import orchestrator, Build, BuildEvent


router = APIRouter()

# Dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class StartBuildRequest(BaseModel):
    """Request to start a new build."""
    portfolio_id: Optional[str] = None
    resume_data: Optional[dict] = None
    user_prompt: Optional[str] = None
    style: str = "modern"
    sections: Optional[List[str]] = None


class BuildResponse(BaseModel):
    """Response with build information."""
    id: str
    status: str
    task_graph: Optional[dict] = None
    error: Optional[str] = None


class RetryTaskRequest(BaseModel):
    """Request to retry a failed task."""
    task_id: str


class RegenerateSectionRequest(BaseModel):
    """Request to regenerate a section."""
    section_id: str
    new_prompt: Optional[str] = None


class FileContentResponse(BaseModel):
    """Response with file content."""
    path: str
    content: str


# ============================================================================
# REST ENDPOINTS
# ============================================================================

@router.post("/start", response_model=BuildResponse)
async def start_build(
    request: StartBuildRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Start a new portfolio build.
    
    This initiates the planning phase and schedules all tasks.
    Connect to the WebSocket endpoint to receive real-time updates.
    """
    build = await orchestrator.start_build(
        user_id=current_user.id,
        portfolio_id=request.portfolio_id,
        resume_data=request.resume_data,
        user_prompt=request.user_prompt,
        style=request.style,
        sections=request.sections,
    )
    
    return BuildResponse(
        id=build.id,
        status=build.status.value,
        task_graph=build.task_graph.to_dict() if build.task_graph else None,
        error=build.error,
    )


@router.get("/{build_id}", response_model=BuildResponse)
async def get_build(
    build_id: str,
    current_user: CurrentUser,
):
    """Get build status and information."""
    build = orchestrator.get_build(build_id)
    
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found"
        )
    
    if build.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return BuildResponse(
        id=build.id,
        status=build.status.value,
        task_graph=build.task_graph.to_dict() if build.task_graph else None,
        error=build.error,
    )


@router.get("/{build_id}/files")
async def get_build_files(
    build_id: str,
    current_user: CurrentUser,
):
    """Get all generated files for a build."""
    build = orchestrator.get_build(build_id)
    
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found"
        )
    
    if build.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    files = orchestrator.get_build_files(build_id)
    
    return {
        "build_id": build_id,
        "files": [{"path": path, "content": content} for path, content in files.items()]
    }


@router.get("/{build_id}/files/{file_path:path}", response_model=FileContentResponse)
async def get_file(
    build_id: str,
    file_path: str,
    current_user: CurrentUser,
):
    """Get a specific file from the build."""
    build = orchestrator.get_build(build_id)
    
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found"
        )
    
    if build.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Normalize path
    if not file_path.startswith("/"):
        file_path = "/" + file_path
    
    content = build.vfs.read(file_path) if build.vfs else None
    
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return FileContentResponse(path=file_path, content=content)


@router.post("/{build_id}/retry")
async def retry_task(
    build_id: str,
    request: RetryTaskRequest,
    current_user: CurrentUser,
):
    """Retry a failed task."""
    build = orchestrator.get_build(build_id)
    
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found"
        )
    
    if build.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    success = await orchestrator.retry_task(build_id, request.task_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot retry task"
        )
    
    return {"status": "retrying", "task_id": request.task_id}


@router.post("/{build_id}/regenerate")
async def regenerate_section(
    build_id: str,
    request: RegenerateSectionRequest,
    current_user: CurrentUser,
):
    """Regenerate a specific section."""
    build = orchestrator.get_build(build_id)
    
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found"
        )
    
    if build.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    success = await orchestrator.regenerate_section(
        build_id, 
        request.section_id,
        request.new_prompt
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot regenerate section"
        )
    
    return {"status": "regenerating", "section_id": request.section_id}


# ============================================================================
# WEBSOCKET ENDPOINT
# ============================================================================

@router.websocket("/{build_id}/stream")
async def stream_build(
    websocket: WebSocket,
    build_id: str,
):
    """
    WebSocket endpoint for real-time build updates.
    
    Event types:
    - build_started
    - planning_started
    - planning_completed
    - build_phase_started
    - task_started
    - file_written
    - task_completed
    - task_failed
    - build_completed
    - build_failed
    """
    await websocket.accept()
    
    # Verify build exists
    build = orchestrator.get_build(build_id)
    if not build:
        await websocket.send_json({"type": "error", "data": {"message": "Build not found"}})
        await websocket.close()
        return
    
    # Event queue for this connection
    event_queue: asyncio.Queue[BuildEvent] = asyncio.Queue()
    
    async def event_handler(event: BuildEvent):
        await event_queue.put(event)
    
    # Subscribe to events
    orchestrator.subscribe(build_id, event_handler)
    
    # Send current state
    await websocket.send_json({
        "type": "current_state",
        "data": build.to_dict(),
    })
    
    try:
        while True:
            # Wait for events with timeout (for ping/pong)
            try:
                event = await asyncio.wait_for(event_queue.get(), timeout=30.0)
                await websocket.send_json(event.to_dict())
                
                # Check if build is complete
                if event.type in ("build_completed", "build_failed"):
                    break
                    
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_json({"type": "ping"})
                
    except WebSocketDisconnect:
        pass
    finally:
        # Unsubscribe
        orchestrator.unsubscribe(build_id, event_handler)


# ============================================================================
# PREVIEW ENDPOINT
# ============================================================================

@router.get("/{build_id}/preview")
async def get_preview_html(
    build_id: str,
    current_user: CurrentUser,
):
    """
    Get the assembled HTML preview for a build.
    
    This returns the complete index.html with all sections inlined.
    """
    build = orchestrator.get_build(build_id)
    
    if not build:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Build not found"
        )
    
    if build.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    if not build.vfs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Build has no files"
        )
    
    # Get index.html
    index_html = build.vfs.read("/index.html")
    
    if not index_html:
        # Generate basic HTML with all files
        index_html = _assemble_preview(build.vfs.get_all_files())
    
    return {"html": index_html}


def _assemble_preview(files: dict) -> str:
    """Assemble a preview HTML from all files."""
    # Collect components
    components = []
    for path, content in sorted(files.items()):
        if path.startswith("/components/") and path.endswith(".html"):
            components.append(content)
    
    # Collect styles
    styles = []
    for path, content in sorted(files.items()):
        if path.endswith(".css"):
            styles.append(content)
    
    # Build HTML
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio Preview</title>
    <style>
    {chr(10).join(styles)}
    </style>
</head>
<body>
    {"".join(components)}
</body>
</html>"""
    
    return html
