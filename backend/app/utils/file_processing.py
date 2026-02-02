"""
File Processing Utilities

Helper functions for handling file uploads and processing.
"""

import os
import re
from typing import Optional


def get_file_extension(filename: str) -> str:
    """
    Extract file extension from filename.
    
    Args:
        filename: Original filename
        
    Returns:
        Lowercase extension with leading dot (e.g., ".pdf")
    """
    if not filename or "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def sanitize_filename(filename: str, max_length: int = 100) -> str:
    """
    Sanitize a filename for safe storage.
    
    Args:
        filename: Original filename
        max_length: Maximum length for the sanitized filename
        
    Returns:
        Sanitized filename
    """
    if not filename:
        return "unnamed"
    
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove or replace unsafe characters
    filename = re.sub(r'[<>:"/\\|?*]', "_", filename)
    
    # Collapse multiple underscores
    filename = re.sub(r"_+", "_", filename)
    
    # Strip leading/trailing whitespace and underscores
    filename = filename.strip().strip("_")
    
    # Truncate if too long
    if len(filename) > max_length:
        name, ext = os.path.splitext(filename)
        max_name_length = max_length - len(ext)
        filename = name[:max_name_length] + ext
    
    return filename or "unnamed"


def is_allowed_file_type(filename: str, allowed_extensions: set) -> bool:
    """
    Check if file type is allowed.
    
    Args:
        filename: Filename to check
        allowed_extensions: Set of allowed extensions (with leading dots)
        
    Returns:
        True if file type is allowed
    """
    ext = get_file_extension(filename)
    return ext in allowed_extensions


def get_mime_type(extension: str) -> Optional[str]:
    """
    Get MIME type for a file extension.
    
    Args:
        extension: File extension (with or without leading dot)
        
    Returns:
        MIME type string or None if unknown
    """
    if not extension.startswith("."):
        extension = "." + extension
    
    mime_types = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain",
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
    }
    
    return mime_types.get(extension.lower())


def generate_storage_key(user_id: str, resume_id: str, extension: str) -> str:
    """
    Generate a unique storage key for a resume file.
    
    Args:
        user_id: User's UUID
        resume_id: Resume's UUID
        extension: File extension
        
    Returns:
        Storage key path
    """
    if not extension.startswith("."):
        extension = "." + extension
    
    return f"resumes/{user_id}/{resume_id}{extension}"
