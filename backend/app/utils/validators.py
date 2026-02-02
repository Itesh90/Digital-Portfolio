"""
Schema Validators

Utilities for validating data against the canonical resume schema.
"""

from typing import Any, Dict, List, Tuple

from app.schemas.resume import ParsedResumeData


def validate_resume_schema(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate data against the canonical resume schema.
    
    Args:
        data: Dictionary to validate
        
    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []
    
    try:
        ParsedResumeData.model_validate(data)
        return True, []
    except Exception as e:
        errors.append(str(e))
        return False, errors


def validate_required_fields(data: Dict[str, Any]) -> List[str]:
    """
    Check for missing required fields in resume data.
    
    Args:
        data: Resume data dictionary
        
    Returns:
        List of missing field names
    """
    required_fields = ["personal", "experience", "skills"]
    missing = []
    
    for field in required_fields:
        if field not in data or not data[field]:
            missing.append(field)
    
    # Check personal info
    personal = data.get("personal", {})
    if not personal.get("name"):
        missing.append("personal.name")
    if not personal.get("email"):
        missing.append("personal.email")
    
    return missing


def validate_experience_items(experience: List[Dict[str, Any]]) -> List[str]:
    """
    Validate experience entries have required information.
    
    Args:
        experience: List of experience items
        
    Returns:
        List of validation warnings
    """
    warnings = []
    
    for i, exp in enumerate(experience):
        if not exp.get("role"):
            warnings.append(f"Experience {i+1}: missing role/title")
        if not exp.get("company"):
            warnings.append(f"Experience {i+1}: missing company name")
        if not exp.get("bullets") or len(exp.get("bullets", [])) == 0:
            warnings.append(f"Experience {i+1}: no achievements/bullets")
    
    return warnings
