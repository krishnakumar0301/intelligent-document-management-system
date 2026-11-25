"""File system helpers: hashing, categorization, validation."""

import hashlib
import mimetypes
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple

# Category mapping by extension
CATEGORY_MAP = {
    "images": {
        ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".ico", ".tiff",
    },
    "videos": {
        ".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v",
    },
    "documents": {
        ".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt",
        ".ppt", ".pptx", ".md",
    },
    "spreadsheets": {
        ".xls", ".xlsx", ".csv", ".ods",
    },
    "audio": {
        ".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a",
    },
    "archives": {
        ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2",
    },
    "code": {
        ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".cpp", ".c", ".h",
        ".cs", ".go", ".rs", ".rb", ".php", ".html", ".css", ".json", ".xml",
        ".yaml", ".yml", ".sql", ".sh", ".bat", ".ps1",
    },
}


def get_extension(filename: str) -> str:
    return Path(filename).suffix.lower()


def categorize_file(filename: str) -> str:
    ext = get_extension(filename)
    for category, extensions in CATEGORY_MAP.items():
        if ext in extensions:
            return category
    return "other"


def compute_file_hash(path: str, chunk_size: int = 65536) -> str:
    """SHA-256 hash for duplicate detection."""
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(chunk_size):
            sha.update(chunk)
    return sha.hexdigest()


def safe_resolve_path(base: str, target: str) -> Optional[Path]:
    """Prevent path traversal — target must be under base."""
    try:
        base_path = Path(base).resolve()
        target_path = Path(target).resolve()
        if not str(target_path).startswith(str(base_path)):
            return None
        return target_path
    except (OSError, ValueError):
        return None


def validate_user_path(path: str, allowed_roots: list[str]) -> bool:
    """Ensure path is within one of the user's allowed scan roots."""
    try:
        resolved = Path(path).resolve()
        for root in allowed_roots:
            if not root:
                continue
            root_path = Path(root).resolve()
            if str(resolved).startswith(str(root_path)):
                return True
        return False
    except OSError:
        return False


def get_file_metadata(path: str) -> Tuple[int, Optional[datetime], str]:
    stat = os.stat(path)
    size = stat.st_size
    mtime = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc)
    mime, _ = mimetypes.guess_type(path)
    return size, mtime, mime or "application/octet-stream"


def format_size(size_bytes: int) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"
