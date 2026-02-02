"""
Build Orchestrator

Central coordinator for the portfolio build pipeline.
Manages task execution, event streaming, and error handling.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum

from app.services.virtual_filesystem import VFSManager, VirtualFilesystem
from app.services.planning_engine import (
    PlanningEngine, TaskGraph, BuildTask, TaskStatus, TaskType
)
from app.services.code_worker import CodeWorker, WorkerResult


class BuildStatus(str, Enum):
    """Overall build status."""
    PENDING = "pending"
    PLANNING = "planning"
    BUILDING = "building"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclass
class BuildEvent:
    """An event in the build stream."""
    type: str
    data: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "data": self.data,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class Build:
    """A single build instance."""
    id: str
    user_id: str
    portfolio_id: Optional[str]
    status: BuildStatus = BuildStatus.PENDING
    task_graph: Optional[TaskGraph] = None
    vfs: Optional[VirtualFilesystem] = None
    resume_data: Optional[Dict[str, Any]] = None
    user_prompt: Optional[str] = None
    style: str = "modern"
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "status": self.status.value,
            "task_graph": self.task_graph.to_dict() if self.task_graph else None,
            "error": self.error,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class BuildOrchestrator:
    """
    Orchestrates the entire build pipeline.
    
    Flow:
    1. Accept input (resume/prompt)
    2. Create task graph via PlanningEngine
    3. Execute tasks in dependency order
    4. Stream events to connected clients
    5. Handle errors and retries
    """
    
    # Store active builds
    _builds: Dict[str, Build] = {}
    _event_listeners: Dict[str, List[Callable]] = {}
    
    def __init__(self):
        self.planning_engine = PlanningEngine()
        self.code_worker = CodeWorker()
    
    async def start_build(
        self,
        user_id: str,
        portfolio_id: Optional[str] = None,
        resume_data: Optional[Dict[str, Any]] = None,
        user_prompt: Optional[str] = None,
        style: str = "modern",
        sections: Optional[List[str]] = None,
    ) -> Build:
        """
        Start a new build.
        
        Args:
            user_id: User identifier
            portfolio_id: Optional portfolio ID to update
            resume_data: Parsed resume data
            user_prompt: User's description
            style: Design style preference
            sections: Specific sections to include
            
        Returns:
            Build instance
        """
        build_id = str(uuid.uuid4()).replace("-", "")[:16]
        
        # Create build
        build = Build(
            id=build_id,
            user_id=user_id,
            portfolio_id=portfolio_id,
            resume_data=resume_data,
            user_prompt=user_prompt,
            style=style,
        )
        
        # Create VFS
        build.vfs = VFSManager.get(build_id)
        
        # Store build
        self._builds[build_id] = build
        
        # Emit start event
        await self._emit(build_id, BuildEvent(
            type="build_started",
            data={"build_id": build_id}
        ))
        
        # Start planning phase
        build.status = BuildStatus.PLANNING
        await self._emit(build_id, BuildEvent(
            type="planning_started",
            data={}
        ))
        
        try:
            # Create task graph
            build.task_graph = self.planning_engine.create_plan(
                build_id=build_id,
                resume_data=resume_data,
                user_prompt=user_prompt,
                style=style,
                sections=sections,
            )
            
            await self._emit(build_id, BuildEvent(
                type="planning_completed",
                data={"tasks": [t.to_dict() for t in build.task_graph.tasks]}
            ))
            
        except Exception as e:
            build.status = BuildStatus.FAILED
            build.error = str(e)
            await self._emit(build_id, BuildEvent(
                type="build_failed",
                data={"error": str(e)}
            ))
            return build
        
        # Start build execution (non-blocking)
        asyncio.create_task(self._execute_build(build))
        
        return build
    
    async def _execute_build(self, build: Build):
        """Execute all tasks in the build."""
        build.status = BuildStatus.BUILDING
        
        await self._emit(build.id, BuildEvent(
            type="build_phase_started",
            data={"phase": "building"}
        ))
        
        while not build.task_graph.is_complete():
            # Get ready tasks
            ready_tasks = build.task_graph.get_ready_tasks()
            
            if not ready_tasks:
                # Check if we're stuck (dependencies failed)
                pending = [t for t in build.task_graph.tasks if t.status == TaskStatus.PENDING]
                if pending:
                    # All pending tasks have failed dependencies
                    build.status = BuildStatus.FAILED
                    build.error = "Build stuck: dependencies failed"
                    break
                continue
            
            # Execute each ready task
            for task in ready_tasks:
                await self._execute_task(build, task)
        
        # Complete build
        if build.status != BuildStatus.FAILED:
            build.status = BuildStatus.COMPLETED
            build.completed_at = datetime.utcnow()
            
            await self._emit(build.id, BuildEvent(
                type="build_completed",
                data={
                    "status": "success",
                    "files": list(build.vfs.get_all_files().keys()),
                }
            ))
        else:
            await self._emit(build.id, BuildEvent(
                type="build_failed",
                data={"error": build.error}
            ))
    
    async def _execute_task(self, build: Build, task: BuildTask):
        """Execute a single task."""
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.utcnow()
        
        await self._emit(build.id, BuildEvent(
            type="task_started",
            data={"task_id": task.id, "task_name": task.name}
        ))
        
        try:
            # Call code worker
            result = await self.code_worker.execute(
                task=task,
                existing_files=build.vfs.get_all_files()
            )
            
            if result.success:
                # Write files to VFS
                for output in result.outputs:
                    build.vfs.write(output.file_path, output.content)
                    
                    # Emit file write event
                    await self._emit(build.id, BuildEvent(
                        type="file_written",
                        data={
                            "path": output.file_path,
                            "content": output.content,
                            "language": output.language,
                        }
                    ))
                
                task.status = TaskStatus.COMPLETED
                task.completed_at = datetime.utcnow()
                task.output_files = [o.file_path for o in result.outputs]
                
                await self._emit(build.id, BuildEvent(
                    type="task_completed",
                    data={"task_id": task.id}
                ))
            else:
                task.status = TaskStatus.FAILED
                task.error = result.error
                
                await self._emit(build.id, BuildEvent(
                    type="task_failed",
                    data={"task_id": task.id, "error": result.error}
                ))
                
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = str(e)
            
            await self._emit(build.id, BuildEvent(
                type="task_failed",
                data={"task_id": task.id, "error": str(e)}
            ))
    
    async def retry_task(self, build_id: str, task_id: str) -> bool:
        """
        Retry a failed task.
        
        Args:
            build_id: Build identifier
            task_id: Task to retry
            
        Returns:
            True if retry started
        """
        build = self._builds.get(build_id)
        if not build or not build.task_graph:
            return False
        
        task = build.task_graph.get_task(task_id)
        if not task or task.status != TaskStatus.FAILED:
            return False
        
        # Reset task
        task.status = TaskStatus.PENDING
        task.error = None
        
        # Re-execute
        await self._execute_task(build, task)
        
        # Continue build if needed
        if build.status == BuildStatus.FAILED:
            build.status = BuildStatus.BUILDING
            asyncio.create_task(self._execute_build(build))
        
        return True
    
    async def regenerate_section(
        self, 
        build_id: str, 
        section_id: str,
        new_prompt: Optional[str] = None
    ) -> bool:
        """
        Regenerate a specific section.
        
        Args:
            build_id: Build identifier
            section_id: Section to regenerate
            new_prompt: Optional new instructions
            
        Returns:
            True if regeneration started
        """
        build = self._builds.get(build_id)
        if not build or not build.task_graph:
            return False
        
        task = build.task_graph.get_task(section_id)
        if not task:
            return False
        
        # Update context if new prompt provided
        if new_prompt:
            task.context["user_instruction"] = new_prompt
        
        # Delete existing files
        for file_path in task.output_files:
            build.vfs.delete(file_path)
        
        # Reset and re-execute
        task.status = TaskStatus.PENDING
        task.error = None
        task.output_files = []
        
        await self._execute_task(build, task)
        
        return True
    
    def get_build(self, build_id: str) -> Optional[Build]:
        """Get a build by ID."""
        return self._builds.get(build_id)
    
    def get_build_files(self, build_id: str) -> Dict[str, str]:
        """Get all files for a build."""
        build = self._builds.get(build_id)
        if not build or not build.vfs:
            return {}
        return build.vfs.get_all_files()
    
    # ============ EVENT STREAMING ============
    
    def subscribe(self, build_id: str, callback: Callable):
        """Subscribe to build events."""
        if build_id not in self._event_listeners:
            self._event_listeners[build_id] = []
        self._event_listeners[build_id].append(callback)
    
    def unsubscribe(self, build_id: str, callback: Callable):
        """Unsubscribe from build events."""
        if build_id in self._event_listeners:
            self._event_listeners[build_id] = [
                cb for cb in self._event_listeners[build_id]
                if cb != callback
            ]
    
    async def _emit(self, build_id: str, event: BuildEvent):
        """Emit an event to all listeners."""
        listeners = self._event_listeners.get(build_id, [])
        for callback in listeners:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                print(f"Event callback error: {e}")


# Singleton instance
orchestrator = BuildOrchestrator()
