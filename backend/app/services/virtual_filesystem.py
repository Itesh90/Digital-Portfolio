"""
Virtual Filesystem Service

In-memory filesystem that stores generated code per build.
This is the source of truth for all generated files.
"""

import os
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from threading import RLock


@dataclass
class VFSFile:
    """Represents a file in the virtual filesystem."""
    path: str
    content: str
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    version: int = 1


@dataclass
class VFSSnapshot:
    """A snapshot of the filesystem for rollback."""
    files: Dict[str, str]
    timestamp: datetime = field(default_factory=datetime.utcnow)


class VirtualFilesystem:
    """
    In-memory virtual filesystem for a single build.
    
    Features:
    - File CRUD operations
    - Directory listing
    - Snapshot/rollback support
    - Thread-safe operations
    """
    
    def __init__(self, build_id: str):
        self.build_id = build_id
        self._files: Dict[str, VFSFile] = {}
        self._snapshots: List[VFSSnapshot] = []
        self._lock = RLock()
    
    def write(self, path: str, content: str) -> VFSFile:
        """
        Write or overwrite a file.
        
        Args:
            path: File path (e.g., "/components/Hero.tsx")
            content: File content
            
        Returns:
            The created/updated VFSFile
        """
        path = self._normalize_path(path)
        
        with self._lock:
            if path in self._files:
                # Update existing
                existing = self._files[path]
                existing.content = content
                existing.updated_at = datetime.utcnow()
                existing.version += 1
                return existing
            else:
                # Create new
                vfs_file = VFSFile(path=path, content=content)
                self._files[path] = vfs_file
                return vfs_file
    
    def read(self, path: str) -> Optional[str]:
        """
        Read a file's content.
        
        Args:
            path: File path
            
        Returns:
            File content or None if not found
        """
        path = self._normalize_path(path)
        
        with self._lock:
            vfs_file = self._files.get(path)
            return vfs_file.content if vfs_file else None
    
    def delete(self, path: str) -> bool:
        """
        Delete a file.
        
        Args:
            path: File path
            
        Returns:
            True if deleted, False if not found
        """
        path = self._normalize_path(path)
        
        with self._lock:
            if path in self._files:
                del self._files[path]
                return True
            return False
    
    def exists(self, path: str) -> bool:
        """Check if a file exists."""
        path = self._normalize_path(path)
        
        with self._lock:
            return path in self._files
    
    def list_files(self, directory: str = "/") -> List[str]:
        """
        List all files in a directory.
        
        Args:
            directory: Directory path (default: root)
            
        Returns:
            List of file paths
        """
        directory = self._normalize_path(directory)
        if not directory.endswith("/"):
            directory += "/"
        
        with self._lock:
            return [
                path for path in self._files.keys()
                if path.startswith(directory) or directory == "/"
            ]
    
    def get_all_files(self) -> Dict[str, str]:
        """
        Get all files as a path->content dictionary.
        
        Returns:
            Dictionary of all files
        """
        with self._lock:
            return {path: vfs_file.content for path, vfs_file in self._files.items()}
    
    def get_file_info(self, path: str) -> Optional[VFSFile]:
        """Get full file info including metadata."""
        path = self._normalize_path(path)
        
        with self._lock:
            return self._files.get(path)
    
    # ============ SNAPSHOT/ROLLBACK ============
    
    def create_snapshot(self) -> int:
        """
        Create a snapshot of current state.
        
        Returns:
            Snapshot index
        """
        with self._lock:
            snapshot = VFSSnapshot(
                files={path: vfs_file.content for path, vfs_file in self._files.items()}
            )
            self._snapshots.append(snapshot)
            return len(self._snapshots) - 1
    
    def rollback(self, snapshot_index: int) -> bool:
        """
        Rollback to a snapshot.
        
        Args:
            snapshot_index: Index of snapshot to restore
            
        Returns:
            True if successful
        """
        with self._lock:
            if snapshot_index < 0 or snapshot_index >= len(self._snapshots):
                return False
            
            snapshot = self._snapshots[snapshot_index]
            self._files = {
                path: VFSFile(path=path, content=content)
                for path, content in snapshot.files.items()
            }
            return True
    
    def clear(self) -> None:
        """Clear all files."""
        with self._lock:
            self._files.clear()
    
    # ============ UTILITIES ============
    
    def _normalize_path(self, path: str) -> str:
        """Normalize a file path."""
        # Ensure leading slash
        if not path.startswith("/"):
            path = "/" + path
        # Remove trailing slashes for files
        path = path.rstrip("/") if path != "/" else path
        # Normalize separators
        path = path.replace("\\", "/")
        return path
    
    def to_dict(self) -> Dict:
        """Serialize filesystem state."""
        with self._lock:
            return {
                "build_id": self.build_id,
                "files": [
                    {
                        "path": f.path,
                        "content": f.content,
                        "version": f.version,
                        "updated_at": f.updated_at.isoformat(),
                    }
                    for f in self._files.values()
                ],
                "snapshot_count": len(self._snapshots),
            }


class VFSManager:
    """
    Manages multiple virtual filesystems (one per build).
    """
    
    _instances: Dict[str, VirtualFilesystem] = {}
    _lock = RLock()
    
    @classmethod
    def get(cls, build_id: str) -> VirtualFilesystem:
        """
        Get or create a VFS for a build.
        
        Args:
            build_id: Build identifier
            
        Returns:
            VirtualFilesystem instance
        """
        with cls._lock:
            if build_id not in cls._instances:
                cls._instances[build_id] = VirtualFilesystem(build_id)
            return cls._instances[build_id]
    
    @classmethod
    def delete(cls, build_id: str) -> bool:
        """
        Delete a VFS instance.
        
        Args:
            build_id: Build identifier
            
        Returns:
            True if deleted
        """
        with cls._lock:
            if build_id in cls._instances:
                del cls._instances[build_id]
                return True
            return False
    
    @classmethod
    def list_builds(cls) -> List[str]:
        """List all active build IDs."""
        with cls._lock:
            return list(cls._instances.keys())
