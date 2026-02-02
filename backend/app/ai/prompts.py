"""
AI Prompts

All AI prompt templates for the Resume Portfolio Builder.
These prompts are designed to enforce strict JSON-only outputs
and prevent AI from inventing information.
"""

import json

from app.schemas.resume import CANONICAL_RESUME_SCHEMA


# =============================================================================
# RESUME PARSING PROMPT
# =============================================================================

RESUME_PARSING_PROMPT = """You are a resume data extractor. Parse the following resume text into the exact JSON schema provided.

CRITICAL RULES:
1. Output ONLY valid JSON matching the schema exactly - no markdown, no explanation, no additional text
2. Do NOT infer or invent any information that is not explicitly stated in the resume
3. If a field cannot be extracted, set it to an empty string "" or empty array []
4. Extract EXACTLY what is written, nothing more
5. Preserve original wording for bullets and descriptions
6. For dates/duration, use the exact format written in the resume
7. Do not add titles, roles, or skills that are not explicitly mentioned

SCHEMA:
{schema}

RESUME TEXT:
{resume_text}

OUTPUT (JSON only, no markdown code blocks, no explanation):"""


def get_resume_parsing_prompt(resume_text: str) -> str:
    """Generate the resume parsing prompt with schema."""
    return RESUME_PARSING_PROMPT.format(
        schema=json.dumps(CANONICAL_RESUME_SCHEMA, indent=2),
        resume_text=resume_text
    )


# =============================================================================
# ROLE INFERENCE PROMPT
# =============================================================================

ROLE_INFERENCE_PROMPT = """Analyze the parsed resume data and infer the professional context.

INPUT RESUME DATA:
{resume_json}

Based on the resume, determine:
1. primary_role: The person's main job title or role category (e.g., "Software Engineer", "Product Manager", "Data Scientist")
2. seniority: One of: "junior", "mid", "senior", "lead", "executive"
3. portfolio_purpose: One of: "job_search", "freelance", "consulting", "showcase"

OUTPUT the following JSON ONLY (no markdown, no explanation):
{{
  "primary_role": "extracted job title or role category",
  "seniority": "junior|mid|senior|lead|executive",
  "portfolio_purpose": "job_search|freelance|consulting|showcase"
}}

RULES:
- Base your inference only on information in the resume
- Choose the most recent/prominent role as primary_role
- Infer seniority from years of experience and job titles
- Infer portfolio_purpose from the resume context (default to job_search if unclear)

JSON OUTPUT:"""


def get_role_inference_prompt(resume_data: dict) -> str:
    """Generate the role inference prompt."""
    return ROLE_INFERENCE_PROMPT.format(
        resume_json=json.dumps(resume_data, indent=2)
    )


# =============================================================================
# PORTFOLIO BLUEPRINT PROMPT
# =============================================================================

BLUEPRINT_PROMPT = """Generate a portfolio structure blueprint based on the resume and inferred role.

INPUTS:
Resume Data:
{resume_json}

Inferred Role:
{role_json}

Generate a portfolio blueprint that determines page structure and content priorities.

OUTPUT JSON with this exact structure:
{{
  "pages": ["home", "about", "experience", "projects", "contact"],
  "section_priority": {{
    "experience": "high|medium|low",
    "projects": "high|medium|low",
    "skills": "high|medium|low",
    "education": "high|medium|low",
    "achievements": "high|medium|low"
  }},
  "tone": "professional|creative|technical|executive",
  "content_length": "concise|standard|detailed"
}}

RULES:
- Only include pages that have corresponding data in the resume
- Set higher priority for sections most relevant to the role
- Match tone to inferred role and seniority:
  - technical roles → "technical"
  - design/creative roles → "creative"
  - leadership/executive → "executive"
  - general → "professional"
- Set content_length based on experience level:
  - junior → "concise"
  - mid → "standard"
  - senior/lead/executive → "detailed"

No HTML, no CSS, structure only. JSON OUTPUT:"""


def get_blueprint_prompt(resume_data: dict, inferred_role: dict) -> str:
    """Generate the blueprint prompt."""
    return BLUEPRINT_PROMPT.format(
        resume_json=json.dumps(resume_data, indent=2),
        role_json=json.dumps(inferred_role, indent=2)
    )


# =============================================================================
# PORTFOLIO CONTENT GENERATION PROMPT
# =============================================================================

CONTENT_GENERATION_PROMPT = """Transform resume data into portfolio-ready content following the blueprint.

INPUTS:
Resume Data:
{resume_json}

Blueprint:
{blueprint_json}

Generate content for each section. Transform professional resume content into engaging portfolio copy.

OUTPUT JSON with this structure:
{{
  "hero": {{
    "headline": "main headline for the hero section",
    "subheadline": "supporting text",
    "cta_text": "call to action button text"
  }},
  "about": {{
    "title": "section title",
    "content": "2-3 paragraphs of about me content",
    "highlights": ["key highlight 1", "key highlight 2", "key highlight 3"]
  }},
  "experience": [
    {{
      "role": "job title",
      "company": "company name",
      "duration": "time period",
      "description": "brief role description",
      "achievements": ["achievement 1", "achievement 2"]
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "description": "project description",
      "tech": ["tech1", "tech2"],
      "link": "project url if available"
    }}
  ],
  "skills": ["skill1", "skill2"],
  "education": [
    {{
      "institution": "school name",
      "degree": "degree type",
      "field": "field of study",
      "duration": "time period"
    }}
  ],
  "achievements": ["achievement1", "achievement2"],
  "contact": {{
    "email": "email address",
    "location": "location",
    "links": ["link1", "link2"]
  }}
}}

RULES:
1. Transform content based on the blueprint's tone setting
2. Do NOT invent information - only transform existing resume data
3. Keep factual accuracy - don't exaggerate achievements
4. Respect content_length setting from blueprint
5. Make content engaging while maintaining truthfulness

JSON OUTPUT:"""


def get_content_generation_prompt(resume_data: dict, blueprint: dict) -> str:
    """Generate the content generation prompt."""
    return CONTENT_GENERATION_PROMPT.format(
        resume_json=json.dumps(resume_data, indent=2),
        blueprint_json=json.dumps(blueprint, indent=2)
    )


# =============================================================================
# SECTION EDIT PROMPT
# =============================================================================

SECTION_EDIT_PROMPT = """You are editing a specific section of a portfolio. Apply the user's instruction to update the section content.

SECTION TYPE: {section_type}

CURRENT CONTENT:
{section_json}

USER INSTRUCTION: {instruction}

OUTPUT: Updated section JSON only, same structure as input.

CRITICAL RULES:
1. Only modify what the instruction specifically asks for
2. Do NOT invent new information not present in the original
3. Do NOT add experiences, skills, or achievements that weren't there
4. Improve language and clarity, do not change facts
5. Keep ATS-friendly formatting (clear, scannable language)
6. Maintain the same JSON structure as the input
7. Output valid JSON only, no markdown, no explanation

If the instruction asks you to add information not in the original, politely refuse by returning the original content unchanged.

UPDATED JSON:"""


def get_section_edit_prompt(section_type: str, current_content: dict, instruction: str) -> str:
    """Generate the section edit prompt."""
    return SECTION_EDIT_PROMPT.format(
        section_type=section_type,
        section_json=json.dumps(current_content, indent=2),
        instruction=instruction
    )


# =============================================================================
# DESIGN SELECTION PROMPT
# =============================================================================

DESIGN_SELECTION_PROMPT = """Select the most appropriate design configuration for a portfolio based on the professional context.

PROFESSIONAL CONTEXT:
- Primary Role: {role}
- Seniority: {seniority}
- Portfolio Purpose: {purpose}

AVAILABLE OPTIONS:
Layouts: ["single-column", "sidebar-left", "sidebar-right", "grid"]
Font Sets: ["modern-sans", "classic-serif", "technical", "creative"]
Palettes: ["neutral-accent", "dark-mode", "warm-minimal", "tech-blue", "ocean-breeze", "forest-green"]
Spacing: ["compact", "comfortable", "spacious"]
Border Radius: ["none", "subtle", "rounded", "pill"]
Shadows: ["none", "subtle", "medium", "strong"]

OUTPUT JSON with this structure:
{{
  "layout": "one of the layout options",
  "font_set": "one of the font set options",
  "palette": "one of the palette options",
  "spacing": "one of the spacing options",
  "border_radius": "one of the border radius options",
  "shadows": "one of the shadow options"
}}

GUIDELINES:
- Technical roles → technical font, tech-blue or dark-mode palette
- Creative roles → creative font, warm-minimal palette, rounded borders
- Executive roles → classic-serif, neutral-accent, professional look
- Freelance purpose → more creative, standout choices
- Job search → professional, clean, ATS-friendly

JSON OUTPUT:"""


def get_design_selection_prompt(role: str, seniority: str, purpose: str) -> str:
    """Generate the design selection prompt."""
    return DESIGN_SELECTION_PROMPT.format(
        role=role,
        seniority=seniority,
        purpose=purpose
    )
