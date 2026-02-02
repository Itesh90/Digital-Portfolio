"""
Planning Engine

Generates a deterministic task graph (DAG) for portfolio generation.
This is the first phase of the build pipeline - planning before execution.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from datetime import datetime


class TaskType(str, Enum):
    """Types of tasks in the build pipeline."""
    SETUP = "setup"           # Initial setup (base files, config)
    SECTION = "section"       # A portfolio section (hero, about, etc.)
    STYLE = "style"           # Styling/theming
    FINALIZE = "finalize"     # Final assembly


class TaskStatus(str, Enum):
    """Status of a task in the pipeline."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class BuildTask:
    """A single task in the build pipeline."""
    id: str
    type: TaskType
    name: str
    description: str
    depends_on: List[str] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    context: Dict[str, Any] = field(default_factory=dict)
    output_files: List[str] = field(default_factory=list)
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "id": self.id,
            "type": self.type.value,
            "name": self.name,
            "description": self.description,
            "depends_on": self.depends_on,
            "status": self.status.value,
            "output_files": self.output_files,
            "error": self.error,
        }


@dataclass
class TaskGraph:
    """A directed acyclic graph of build tasks."""
    build_id: str
    tasks: List[BuildTask] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    def get_task(self, task_id: str) -> Optional[BuildTask]:
        """Get a task by ID."""
        for task in self.tasks:
            if task.id == task_id:
                return task
        return None
    
    def get_ready_tasks(self) -> List[BuildTask]:
        """Get tasks that are ready to execute (dependencies completed)."""
        ready = []
        for task in self.tasks:
            if task.status != TaskStatus.PENDING:
                continue
            
            # Check if all dependencies are completed
            deps_completed = all(
                self.get_task(dep_id) and 
                self.get_task(dep_id).status == TaskStatus.COMPLETED
                for dep_id in task.depends_on
            )
            
            if deps_completed:
                ready.append(task)
        
        return ready
    
    def is_complete(self) -> bool:
        """Check if all tasks are completed or failed."""
        return all(
            task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.SKIPPED)
            for task in self.tasks
        )
    
    def get_progress(self) -> Dict[str, int]:
        """Get task completion progress."""
        total = len(self.tasks)
        completed = sum(1 for t in self.tasks if t.status == TaskStatus.COMPLETED)
        failed = sum(1 for t in self.tasks if t.status == TaskStatus.FAILED)
        running = sum(1 for t in self.tasks if t.status == TaskStatus.RUNNING)
        pending = sum(1 for t in self.tasks if t.status == TaskStatus.PENDING)
        
        return {
            "total": total,
            "completed": completed,
            "failed": failed,
            "running": running,
            "pending": pending,
            "percent": int((completed / total) * 100) if total > 0 else 0,
        }
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "build_id": self.build_id,
            "tasks": [t.to_dict() for t in self.tasks],
            "progress": self.get_progress(),
        }


# ============================================================================
# SECTION DEFINITIONS
# ============================================================================

PORTFOLIO_SECTIONS = {
    "hero": {
        "name": "Hero Section",
        "description": "Main header with name, title, and intro",
        "files": ["/components/Hero.tsx", "/styles/hero.css"],
    },
    "about": {
        "name": "About Section",
        "description": "Personal introduction and summary",
        "files": ["/components/About.tsx", "/styles/about.css"],
    },
    "skills": {
        "name": "Skills Section",
        "description": "Technical skills and expertise",
        "files": ["/components/Skills.tsx", "/styles/skills.css"],
    },
    "experience": {
        "name": "Experience Section",
        "description": "Work history and achievements",
        "files": ["/components/Experience.tsx", "/styles/experience.css"],
    },
    "projects": {
        "name": "Projects Section",
        "description": "Portfolio of work and projects",
        "files": ["/components/Projects.tsx", "/styles/projects.css"],
    },
    "education": {
        "name": "Education Section",
        "description": "Academic background",
        "files": ["/components/Education.tsx", "/styles/education.css"],
    },
    "contact": {
        "name": "Contact Section",
        "description": "Contact information and form",
        "files": ["/components/Contact.tsx", "/styles/contact.css"],
    },
}


class PlanningEngine:
    """
    Generates task graphs based on user input and resume data.
    
    The planning engine analyzes what the user wants and creates
    a deterministic, dependency-ordered list of tasks.
    """
    
    def create_plan(
        self,
        build_id: str,
        resume_data: Optional[Dict[str, Any]] = None,
        user_prompt: Optional[str] = None,
        style: str = "modern",
        sections: Optional[List[str]] = None,
    ) -> TaskGraph:
        """
        Create a build plan based on input.
        
        Args:
            build_id: Unique build identifier
            resume_data: Parsed resume data (optional)
            user_prompt: User's description of what they want
            style: Design style preference
            sections: Specific sections to include (or auto-detect)
            
        Returns:
            TaskGraph with all tasks
        """
        # Determine sections to generate
        if sections:
            selected_sections = [s for s in sections if s in PORTFOLIO_SECTIONS]
        else:
            selected_sections = self._infer_sections(resume_data, user_prompt)
        
        # Build task list
        tasks: List[BuildTask] = []
        
        # 1. Setup task (always first)
        tasks.append(BuildTask(
            id="init",
            type=TaskType.SETUP,
            name="Initialize Project",
            description="Create base files and structure",
            depends_on=[],
            context={"style": style},
            output_files=["/index.html", "/styles/globals.css", "/scripts/main.js"],
        ))
        
        # 2. Style task
        tasks.append(BuildTask(
            id="style",
            type=TaskType.STYLE,
            name="Generate Styles",
            description="Create theme and design tokens",
            depends_on=["init"],
            context={"style": style},
            output_files=["/styles/theme.css", "/styles/variables.css"],
        ))
        
        # 3. Section tasks (in order, with dependencies)
        prev_task_id = "style"
        for section_id in selected_sections:
            section_info = PORTFOLIO_SECTIONS[section_id]
            
            task = BuildTask(
                id=section_id,
                type=TaskType.SECTION,
                name=section_info["name"],
                description=section_info["description"],
                depends_on=[prev_task_id],
                context={
                    "section_id": section_id,
                    "resume_data": resume_data,
                    "style": style,
                },
                output_files=section_info["files"],
            )
            tasks.append(task)
            prev_task_id = section_id
        
        # 4. Finalize task (always last)
        tasks.append(BuildTask(
            id="finalize",
            type=TaskType.FINALIZE,
            name="Finalize Portfolio",
            description="Assemble all sections and create final output",
            depends_on=[prev_task_id],
            context={},
            output_files=["/index.html"],
        ))
        
        return TaskGraph(build_id=build_id, tasks=tasks)
    
    def _infer_sections(
        self,
        resume_data: Optional[Dict[str, Any]],
        user_prompt: Optional[str],
    ) -> List[str]:
        """
        Infer which sections to include based on resume/prompt.
        
        Returns:
            List of section IDs
        """
        # Default sections
        sections = ["hero", "about"]
        
        if resume_data:
            # Add sections based on resume content
            if resume_data.get("skills"):
                sections.append("skills")
            if resume_data.get("work_experience"):
                sections.append("experience")
            if resume_data.get("projects"):
                sections.append("projects")
            if resume_data.get("education"):
                sections.append("education")
        else:
            # Default full set for prompt-based
            sections = ["hero", "about", "skills", "experience", "projects"]
        
        # Always add contact at the end
        sections.append("contact")
        
        return sections
    
    def get_section_context(
        self,
        section_id: str,
        resume_data: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Get context data for a specific section.
        
        This extracts and formats the relevant resume data
        for the LLM worker to use.
        """
        if not resume_data:
            return {}
        
        context: Dict[str, Any] = {}
        
        if section_id == "hero":
            context = {
                "name": resume_data.get("name", ""),
                "title": resume_data.get("headline", ""),
                "summary": resume_data.get("summary", ""),
            }
        elif section_id == "about":
            context = {
                "summary": resume_data.get("summary", ""),
                "highlights": resume_data.get("highlights", []),
            }
        elif section_id == "skills":
            context = {
                "skills": resume_data.get("skills", []),
            }
        elif section_id == "experience":
            context = {
                "work_experience": resume_data.get("work_experience", []),
            }
        elif section_id == "projects":
            context = {
                "projects": resume_data.get("projects", []),
            }
        elif section_id == "education":
            context = {
                "education": resume_data.get("education", []),
            }
        elif section_id == "contact":
            context = {
                "email": resume_data.get("email", ""),
                "phone": resume_data.get("phone", ""),
                "linkedin": resume_data.get("linkedin", ""),
                "github": resume_data.get("github", ""),
                "website": resume_data.get("website", ""),
            }
        
        return context
