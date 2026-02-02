"""
ATS Validator Service

Checks portfolio content for ATS compatibility.
"""

from typing import Any, Dict, List

from app.schemas.portfolio import ATSCheckResult


class ATSValidatorService:
    """
    Service for validating portfolio content against ATS best practices.
    
    Checks:
    - Keyword coverage
    - Bullet point clarity
    - Readability scoring
    - Section completeness
    """
    
    # Common power verbs that ATS systems look for
    POWER_VERBS = {
        "achieved", "built", "created", "delivered", "designed",
        "developed", "drove", "established", "executed", "generated",
        "grew", "implemented", "improved", "increased", "launched",
        "led", "managed", "optimized", "orchestrated", "produced",
        "reduced", "resolved", "scaled", "spearheaded", "streamlined",
        "transformed", "upgraded"
    }
    
    # Required sections for a complete portfolio
    REQUIRED_SECTIONS = ["about", "experience", "skills", "contact"]
    
    async def validate(
        self,
        content: Dict[str, Any],
        resume_data: Dict[str, Any] | None = None,
    ) -> ATSCheckResult:
        """
        Run comprehensive ATS validation on portfolio content.
        
        Args:
            content: Portfolio content dictionary
            resume_data: Original resume data for keyword comparison
            
        Returns:
            ATSCheckResult with scores and suggestions
        """
        suggestions = []
        
        # Check section completeness
        section_completeness = self._check_section_completeness(content)
        missing_sections = [k for k, v in section_completeness.items() if not v]
        if missing_sections:
            suggestions.append(f"Missing sections: {', '.join(missing_sections)}")
        
        # Check keyword coverage
        keyword_coverage = self._check_keyword_coverage(content, resume_data)
        if keyword_coverage < 0.7:
            suggestions.append("Consider adding more relevant keywords from your resume")
        
        # Check bullet clarity
        bullet_clarity = self._check_bullet_clarity(content)
        if bullet_clarity < 0.8:
            suggestions.append("Some bullet points could be more action-oriented")
        
        # Check readability
        readability = self._check_readability(content)
        if readability < 0.7:
            suggestions.append("Consider simplifying some text for better readability")
        
        # Calculate overall score
        completeness_score = sum(section_completeness.values()) / len(section_completeness)
        overall_score = int(
            (keyword_coverage * 0.3 + bullet_clarity * 0.3 + 
             readability * 0.2 + completeness_score * 0.2) * 100
        )
        
        return ATSCheckResult(
            score=overall_score,
            keyword_coverage=keyword_coverage,
            bullet_clarity=bullet_clarity,
            readability_score=readability,
            section_completeness=section_completeness,
            suggestions=suggestions,
            passed=overall_score >= 70,
        )
    
    def _check_section_completeness(self, content: Dict[str, Any]) -> Dict[str, bool]:
        """Check if all required sections have content."""
        completeness = {}
        
        for section in self.REQUIRED_SECTIONS:
            section_content = content.get(section)
            if section_content is None:
                completeness[section] = False
            elif isinstance(section_content, dict):
                completeness[section] = bool(section_content)
            elif isinstance(section_content, list):
                completeness[section] = len(section_content) > 0
            elif isinstance(section_content, str):
                completeness[section] = len(section_content.strip()) > 0
            else:
                completeness[section] = bool(section_content)
        
        return completeness
    
    def _check_keyword_coverage(
        self, 
        content: Dict[str, Any], 
        resume_data: Dict[str, Any] | None
    ) -> float:
        """Check how well portfolio keywords match resume keywords."""
        if not resume_data:
            return 0.8  # Default score if no resume data
        
        # Extract keywords from resume skills
        resume_skills = set(
            skill.lower() 
            for skill in resume_data.get("skills", [])
        )
        
        if not resume_skills:
            return 0.8
        
        # Check how many skills appear in portfolio content
        content_text = self._extract_text(content).lower()
        matched = sum(1 for skill in resume_skills if skill in content_text)
        
        return matched / len(resume_skills) if resume_skills else 1.0
    
    def _check_bullet_clarity(self, content: Dict[str, Any]) -> float:
        """Check if bullet points start with action verbs."""
        bullets = []
        
        # Extract bullets from experience
        for exp in content.get("experience", []):
            if isinstance(exp, dict):
                bullets.extend(exp.get("achievements", []))
                bullets.extend(exp.get("bullets", []))
        
        if not bullets:
            return 0.8
        
        # Check for power verbs at the start
        good_bullets = 0
        for bullet in bullets:
            if isinstance(bullet, str):
                first_word = bullet.split()[0].lower() if bullet.split() else ""
                if first_word in self.POWER_VERBS:
                    good_bullets += 1
                elif any(bullet.lower().startswith(verb) for verb in self.POWER_VERBS):
                    good_bullets += 0.5
        
        return good_bullets / len(bullets) if bullets else 1.0
    
    def _check_readability(self, content: Dict[str, Any]) -> float:
        """Check content readability (simplified Flesch-Kincaid proxy)."""
        text = self._extract_text(content)
        
        if not text:
            return 0.8
        
        # Simple readability check based on sentence/word length
        sentences = text.replace("!", ".").replace("?", ".").split(".")
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return 0.8
        
        word_count = sum(len(s.split()) for s in sentences)
        avg_sentence_length = word_count / len(sentences)
        
        # Ideal: 15-20 words per sentence
        if 12 <= avg_sentence_length <= 25:
            length_score = 1.0
        elif avg_sentence_length < 12:
            length_score = 0.8
        else:
            length_score = max(0.5, 1 - (avg_sentence_length - 25) * 0.02)
        
        return length_score
    
    def _extract_text(self, content: Dict[str, Any]) -> str:
        """Recursively extract all text from content dictionary."""
        texts = []
        
        def extract(obj):
            if isinstance(obj, str):
                texts.append(obj)
            elif isinstance(obj, dict):
                for v in obj.values():
                    extract(v)
            elif isinstance(obj, list):
                for item in obj:
                    extract(item)
        
        extract(content)
        return " ".join(texts)
