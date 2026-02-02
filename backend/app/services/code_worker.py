"""
Code Worker Service

LLM-powered worker that generates code for a single task.
Each worker receives minimal context and outputs file-level patches.
"""

import json
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

import google.generativeai as genai

from app.config import get_settings
from app.services.planning_engine import BuildTask, TaskType

settings = get_settings()


@dataclass
class CodeOutput:
    """Output from a code generation task."""
    file_path: str
    content: str
    language: str = "html"


@dataclass 
class WorkerResult:
    """Result from a code worker execution."""
    task_id: str
    success: bool
    outputs: List[CodeOutput]
    error: Optional[str] = None


# ============================================================================
# PROMPT TEMPLATES
# ============================================================================

SETUP_PROMPT = """You are generating the base HTML structure for a portfolio website.

Style: {style}
User Name: {name}
Title: {title}

Generate a complete, modern HTML5 document with:
1. Proper meta tags and viewport
2. Link to /styles/globals.css
3. Script tag for /scripts/main.js
4. Empty container divs for each section: #hero, #about, #skills, #experience, #projects, #contact
5. Smooth scrolling enabled

Output JSON format:
{{
  "files": [
    {{"path": "/index.html", "content": "...full HTML..."}},
    {{"path": "/styles/globals.css", "content": "...base CSS reset and utilities..."}},
    {{"path": "/scripts/main.js", "content": "...minimal JS for interactivity..."}}
  ]
}}

Output ONLY valid JSON. No explanations."""


STYLE_PROMPT = """You are generating CSS theme variables and styles.

Style theme: {style}

Generate modern CSS with:
1. CSS custom properties (variables) for colors, fonts, spacing
2. Typography scale
3. Button styles
4. Card styles
5. Responsive breakpoints

Output JSON format:
{{
  "files": [
    {{"path": "/styles/theme.css", "content": "...theme CSS..."}},
    {{"path": "/styles/variables.css", "content": "...CSS variables..."}}
  ]
}}

Output ONLY valid JSON. No explanations."""


SECTION_PROMPTS = {
    "hero": """Generate HTML and CSS for a Hero section.

Data:
- Name: {name}
- Title: {title}  
- Summary: {summary}

Requirements:
1. Full-viewport hero with gradient background
2. Large name and title
3. Brief tagline
4. CTA button to scroll to contact
5. Subtle animation

Output JSON:
{{
  "files": [
    {{"path": "/components/Hero.html", "content": "...section HTML..."}},
    {{"path": "/styles/hero.css", "content": "...section CSS..."}}
  ]
}}

Output ONLY valid JSON.""",

    "about": """Generate HTML and CSS for an About section.

Data:
- Summary: {summary}
- Highlights: {highlights}

Requirements:
1. Clean layout with photo placeholder
2. Bio paragraph
3. Key highlights as cards or list
4. Professional but approachable tone

Output JSON:
{{
  "files": [
    {{"path": "/components/About.html", "content": "...section HTML..."}},
    {{"path": "/styles/about.css", "content": "...section CSS..."}}
  ]
}}

Output ONLY valid JSON.""",

    "skills": """Generate HTML and CSS for a Skills section.

Data:
- Skills: {skills}

Requirements:
1. Categorized skill display
2. Visual skill level indicators or tags
3. Modern grid or flexbox layout
4. Icons or visual elements

Output JSON:
{{
  "files": [
    {{"path": "/components/Skills.html", "content": "...section HTML..."}},
    {{"path": "/styles/skills.css", "content": "...section CSS..."}}
  ]
}}

Output ONLY valid JSON.""",

    "experience": """Generate HTML and CSS for an Experience section.

Data:
- Work Experience: {work_experience}

Requirements:
1. Timeline or card-based layout
2. Company, role, dates, description for each
3. Achievements/bullet points
4. Clean, scannable format

Output JSON:
{{
  "files": [
    {{"path": "/components/Experience.html", "content": "...section HTML..."}},
    {{"path": "/styles/experience.css", "content": "...section CSS..."}}
  ]
}}

Output ONLY valid JSON.""",

    "projects": """Generate HTML and CSS for a Projects section.

Data:
- Projects: {projects}

Requirements:
1. Project cards with image placeholders
2. Title, description, tech stack
3. Links to live demo / repo
4. Hover effects

Output JSON:
{{
  "files": [
    {{"path": "/components/Projects.html", "content": "...section HTML..."}},
    {{"path": "/styles/projects.css", "content": "...section CSS..."}}
  ]
}}

Output ONLY valid JSON.""",

    "education": """Generate HTML and CSS for an Education section.

Data:
- Education: {education}

Requirements:
1. Clean academic history display
2. Degree, institution, dates
3. Relevant coursework or achievements
4. Simple, professional layout

Output JSON:
{{
  "files": [
    {{"path": "/components/Education.html", "content": "...section HTML..."}},
    {{"path": "/styles/education.css", "content": "...section CSS..."}}
  ]
}}

Output ONLY valid JSON.""",

    "contact": """Generate HTML and CSS for a Contact section.

Data:
- Email: {email}
- Phone: {phone}
- LinkedIn: {linkedin}
- GitHub: {github}

Requirements:
1. Contact form with name, email, message
2. Social links with icons
3. Call-to-action text
4. Professional footer styling

Output JSON:
{{
  "files": [
    {{"path": "/components/Contact.html", "content": "...section HTML..."}},
    {{"path": "/styles/contact.css", "content": "...section CSS..."}}
  ]
}}

Output ONLY valid JSON.""",
}


FINALIZE_PROMPT = """Combine all HTML section components into the final index.html.

Existing sections in /components/:
{component_list}

Generate ONLY the updated index.html that includes all section components inline.
The file should be a complete, valid HTML document.

Output JSON:
{{
  "files": [
    {{"path": "/index.html", "content": "...complete HTML with all sections..."}}
  ]
}}

Output ONLY valid JSON."""


class CodeWorker:
    """
    LLM worker that generates code for a single task.
    
    Principles:
    - One task at a time
    - Minimal context
    - Machine-parseable output (JSON only)
    - File-level granularity
    """
    
    def __init__(self):
        """Initialize with Gemini API."""
        genai.configure(api_key=settings.gemini_api_key)
        
        self.model = genai.GenerativeModel(
            "gemini-2.0-flash",
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                max_output_tokens=8192,
            )
        )
    
    async def execute(self, task: BuildTask, existing_files: Dict[str, str] = None) -> WorkerResult:
        """
        Execute a single task and generate code.
        
        Args:
            task: The BuildTask to execute
            existing_files: Dict of existing files in VFS (for finalize)
            
        Returns:
            WorkerResult with generated files
        """
        try:
            if task.type == TaskType.SETUP:
                return await self._generate_setup(task)
            elif task.type == TaskType.STYLE:
                return await self._generate_style(task)
            elif task.type == TaskType.SECTION:
                return await self._generate_section(task)
            elif task.type == TaskType.FINALIZE:
                return await self._generate_finalize(task, existing_files or {})
            else:
                return WorkerResult(
                    task_id=task.id,
                    success=False,
                    outputs=[],
                    error=f"Unknown task type: {task.type}"
                )
        except Exception as e:
            return WorkerResult(
                task_id=task.id,
                success=False,
                outputs=[],
                error=str(e)
            )
    
    async def _generate_setup(self, task: BuildTask) -> WorkerResult:
        """Generate base project setup."""
        context = task.context
        prompt = SETUP_PROMPT.format(
            style=context.get("style", "modern"),
            name=context.get("name", "John Doe"),
            title=context.get("title", "Software Developer"),
        )
        
        return await self._call_llm(task.id, prompt)
    
    async def _generate_style(self, task: BuildTask) -> WorkerResult:
        """Generate theme and CSS variables."""
        context = task.context
        prompt = STYLE_PROMPT.format(
            style=context.get("style", "modern"),
        )
        
        return await self._call_llm(task.id, prompt)
    
    async def _generate_section(self, task: BuildTask) -> WorkerResult:
        """Generate a portfolio section."""
        section_id = task.context.get("section_id")
        
        if section_id not in SECTION_PROMPTS:
            return WorkerResult(
                task_id=task.id,
                success=False,
                outputs=[],
                error=f"Unknown section: {section_id}"
            )
        
        # Get section-specific data
        resume_data = task.context.get("resume_data") or {}
        section_data = self._extract_section_data(section_id, resume_data)
        
        prompt = SECTION_PROMPTS[section_id].format(**section_data)
        
        return await self._call_llm(task.id, prompt)
    
    async def _generate_finalize(self, task: BuildTask, existing_files: Dict[str, str]) -> WorkerResult:
        """Finalize and combine all sections."""
        # List component files
        components = [
            path for path in existing_files.keys()
            if path.startswith("/components/") and path.endswith(".html")
        ]
        
        prompt = FINALIZE_PROMPT.format(
            component_list="\n".join(f"- {c}" for c in components)
        )
        
        return await self._call_llm(task.id, prompt)
    
    async def _call_llm(self, task_id: str, prompt: str) -> WorkerResult:
        """Call LLM and parse response."""
        try:
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            
            # Extract JSON
            data = self._extract_json(text)
            
            if "files" not in data:
                return WorkerResult(
                    task_id=task_id,
                    success=False,
                    outputs=[],
                    error="Invalid response: missing 'files' key"
                )
            
            outputs = []
            for file_data in data["files"]:
                outputs.append(CodeOutput(
                    file_path=file_data["path"],
                    content=file_data["content"],
                    language=self._detect_language(file_data["path"]),
                ))
            
            return WorkerResult(
                task_id=task_id,
                success=True,
                outputs=outputs,
            )
            
        except Exception as e:
            return WorkerResult(
                task_id=task_id,
                success=False,
                outputs=[],
                error=str(e)
            )
    
    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extract JSON from LLM response."""
        import re
        
        # Try direct parse
        try:
            return json.loads(text)
        except:
            pass
        
        # Try extracting from markdown code block
        match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if match:
            try:
                return json.loads(match.group(1))
            except:
                pass
        
        # Try finding JSON object
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group(0))
        
        raise ValueError("Could not extract JSON from response")
    
    def _extract_section_data(self, section_id: str, resume_data: Dict) -> Dict:
        """Extract relevant data for a section."""
        defaults = {
            "name": "John Doe",
            "title": "Software Developer",
            "summary": "Experienced professional",
            "highlights": [],
            "skills": [],
            "work_experience": [],
            "projects": [],
            "education": [],
            "email": "email@example.com",
            "phone": "",
            "linkedin": "",
            "github": "",
        }
        
        # Merge with resume data
        data = {**defaults, **resume_data}
        
        # Convert complex objects to strings for prompt
        for key in ["highlights", "skills", "work_experience", "projects", "education"]:
            if isinstance(data.get(key), list):
                data[key] = json.dumps(data[key], indent=2)
        
        return data
    
    def _detect_language(self, path: str) -> str:
        """Detect file language from path."""
        if path.endswith(".html"):
            return "html"
        elif path.endswith(".css"):
            return "css"
        elif path.endswith(".js"):
            return "javascript"
        elif path.endswith(".tsx") or path.endswith(".ts"):
            return "typescript"
        else:
            return "plaintext"
