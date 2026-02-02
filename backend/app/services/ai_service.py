"""
AI Service

Handles all AI interactions using Google Gemini API.
Enforces JSON-only outputs and schema validation.
"""

import json
import re
from typing import Any, Dict

import google.generativeai as genai

from app.config import get_settings
from app.ai.prompts import (
    get_resume_parsing_prompt,
    get_role_inference_prompt,
    get_blueprint_prompt,
    get_content_generation_prompt,
    get_section_edit_prompt,
    get_design_selection_prompt,
)

settings = get_settings()


class AIService:
    """
    Service for AI-powered resume parsing and portfolio generation.
    
    Uses Google Gemini API with JSON mode for structured outputs.
    All outputs are validated against expected schemas.
    """
    
    def __init__(self):
        """Initialize the AI service with Gemini API."""
        genai.configure(api_key=settings.gemini_api_key)
        
        # Use Gemini 2.0 Flash for text generation
        self.model = genai.GenerativeModel(
            "gemini-2.0-flash",
            generation_config=genai.GenerationConfig(
                temperature=0.1,  # Low temperature for consistency
                max_output_tokens=4096,
            )
        )
    
    def _extract_json(self, text: str) -> Dict[str, Any]:
        """
        Extract JSON from AI response, handling potential markdown formatting.
        
        Args:
            text: Raw AI response text
            
        Returns:
            Parsed JSON dictionary
            
        Raises:
            ValueError: If valid JSON cannot be extracted
        """
        # Try direct parsing first
        try:
            return json.loads(text.strip())
        except json.JSONDecodeError:
            pass
        
        # Try removing markdown code blocks
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try finding JSON object in the text
        json_match = re.search(r"\{[\s\S]*\}", text)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass
        
        raise ValueError(f"Failed to extract valid JSON from response: {text[:200]}...")
    
    async def _generate_with_retry(
        self, 
        prompt: str, 
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Generate AI response with retries for JSON parsing failures.
        
        Args:
            prompt: The prompt to send to the AI
            max_retries: Maximum number of retry attempts
            
        Returns:
            Parsed JSON response
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                response = self.model.generate_content(prompt)
                result = self._extract_json(response.text)
                return result
            except ValueError as e:
                last_error = e
                # Add stricter instruction for retry
                if attempt < max_retries - 1:
                    prompt = f"{prompt}\n\nIMPORTANT: Your previous response was not valid JSON. Output ONLY a valid JSON object, nothing else."
        
        raise ValueError(f"Failed to get valid JSON after {max_retries} attempts: {last_error}")
    
    async def parse_resume(self, resume_text: str) -> Dict[str, Any]:
        """
        Parse resume text into structured JSON following the canonical schema.
        
        Args:
            resume_text: Raw text extracted from resume file
            
        Returns:
            Parsed resume data matching the canonical schema
        """
        prompt = get_resume_parsing_prompt(resume_text)
        return await self._generate_with_retry(prompt)
    
    async def infer_role(self, resume_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Infer professional role, seniority, and portfolio purpose from resume.
        
        Args:
            resume_data: Parsed resume data
            
        Returns:
            Inferred role information
        """
        prompt = get_role_inference_prompt(resume_data)
        return await self._generate_with_retry(prompt)
    
    async def generate_blueprint(
        self, 
        resume_data: Dict[str, Any],
        inferred_role: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate portfolio blueprint defining structure and priorities.
        
        Args:
            resume_data: Parsed resume data
            inferred_role: Inferred role information
            
        Returns:
            Portfolio blueprint
        """
        prompt = get_blueprint_prompt(resume_data, inferred_role or {})
        return await self._generate_with_retry(prompt)
    
    async def generate_portfolio_content(
        self,
        resume_data: Dict[str, Any],
        blueprint: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate portfolio content from resume data following blueprint.
        
        Args:
            resume_data: Parsed resume data
            blueprint: Portfolio blueprint
            
        Returns:
            Generated portfolio content
        """
        prompt = get_content_generation_prompt(resume_data, blueprint)
        return await self._generate_with_retry(prompt)
    
    async def edit_section(
        self,
        section_type: str,
        current_content: Dict[str, Any],
        instruction: str,
    ) -> Dict[str, Any]:
        """
        Edit a specific portfolio section based on user instruction.
        
        AI operates ONLY within the specified section scope and cannot
        invent new information.
        
        Args:
            section_type: Type of section being edited
            current_content: Current section content
            instruction: User's edit instruction
            
        Returns:
            Updated section content
        """
        prompt = get_section_edit_prompt(section_type, current_content, instruction)
        return await self._generate_with_retry(prompt)
    
    async def suggest_design(
        self,
        inferred_role: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Suggest design configuration based on professional context.
        
        Args:
            inferred_role: Inferred role information
            
        Returns:
            Suggested design configuration
        """
        prompt = get_design_selection_prompt(
            role=inferred_role.get("primary_role", "Professional"),
            seniority=inferred_role.get("seniority", "mid"),
            purpose=inferred_role.get("portfolio_purpose", "job_search"),
        )
        return await self._generate_with_retry(prompt)
