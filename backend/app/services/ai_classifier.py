"""AI-powered file classification engine.

Classifies files into categories and subcategories using:
- Filename & extension analysis
- OCR text extraction (images/PDFs)
- Document text extraction (PDF/DOCX/TXT)
- Image metadata analysis (EXIF, dimensions)
- Video/audio metadata analysis
- Keyword matching & TF-IDF scoring
"""

import logging
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.services.ocr_service import extract_text_from_file as ocr_extract
from app.utils.file_utils import CATEGORY_MAP, get_extension

logger = logging.getLogger(__name__)

# ── Thresholds ──────────────────────────────────────────────────────────────
CONFIDENCE_THRESHOLD = 0.4  # below this → "Others" fallback

# ── Subcategory definitions ─────────────────────────────────────────────────
DOCUMENT_SUBCATEGORIES = [
    "Notes", "Resume", "Assignments", "Question_Papers",
    "Research_Papers", "Books", "Certificates", "Reports",
    "Invoices", "Others",
]

IMAGE_SUBCATEGORIES = [
    "Profile_Photos", "Screenshots", "Documents_Scans", "Receipts",
    "Product_Photos", "Nature", "People", "Memes", "Posters", "Others",
]

VIDEO_SUBCATEGORIES = [
    "Movies", "Songs", "Lectures", "Screen_Recordings",
    "Reels_Shorts", "Personal_Videos", "Others",
]

AUDIO_SUBCATEGORIES = [
    "Music", "Voice_Notes", "Podcasts", "Recordings", "Others",
]

SPREADSHEET_SUBCATEGORIES = [
    "Finance", "Data", "Reports", "Others",
]

# ── Keyword patterns for subcategory matching ──────────────────────────────
DOC_KEYWORDS: Dict[str, List[str]] = {
    "Notes": ["note", "notes", "lecture", "summary", "chapter", "topic", "class", "lesson"],
    "Resume": ["resume", "cv", "curriculum", "vitae", "bio"],
    "Assignments": ["assignment", "homework", "task", "exercise", "problem", "solution", "lab"],
    "Question_Papers": ["question", "exam", "test", "quiz", "paper", "midterm", "final", "practice"],
    "Research_Papers": ["research", "paper", "journal", "conference", "ieee", "arxiv", "publication", "thesis", "dissertation"],
    "Books": ["book", "ebook", "handbook", "guide", "manual", "tutorial", "reference"],
    "Certificates": ["certificate", "certification", "diploma", "degree", "achievement", "award", "license"],
    "Reports": ["report", "analysis", "review", "audit", "summary", "annual", "quarterly"],
    "Invoices": ["invoice", "bill", "receipt", "payment", "purchase", "order", "tax", "fiscal"],
}

IMAGE_KEYWORDS: Dict[str, List[str]] = {
    "Screenshots": ["screenshot", "screen", "capture", "snip", "snapshot"],
    "Documents_Scans": ["scan", "document", "page", "doc", "letter", "form"],
    "Receipts": ["receipt", "bill", "invoice", "payment", "purchase"],
    "Profile_Photos": ["profile", "avatar", "photo", "selfie", "pic"],
    "Product_Photos": ["product", "item", "goods", "merchandise"],
    "Nature": ["nature", "landscape", "sky", "sunset", "sunrise", "mountain", "beach", "forest", "flower", "tree"],
    "People": ["people", "person", "family", "friend", "group", "portrait"],
    "Memes": ["meme", "funny", "joke", "humor"],
    "Posters": ["poster", "banner", "flyer", "ad", "promotion"],
}

VIDEO_KEYWORDS: Dict[str, List[str]] = {
    "Movies": ["movie", "film", "mkv", "bluray", "brrip", "hdrip", "x264", "x265"],
    "Songs": ["song", "music", "video", "audio", "mv", "lyric"],
    "Lectures": ["lecture", "lesson", "course", "tutorial", "class", "recording", "session"],
    "Screen_Recordings": ["screen", "recording", "capture", "demo", "walkthrough"],
    "Reels_Shorts": ["reel", "short", "shorts", "tiktok", "instagram", "story"],
    "Personal_Videos": ["personal", "vacation", "birthday", "party", "wedding", "trip", "family"],
}

AUDIO_KEYWORDS: Dict[str, List[str]] = {
    "Music": ["song", "music", "track", "audio", "remix", "cover", "instrumental", "mp3"],
    "Voice_Notes": ["voice", "note", "recording", "voice note", "audio note", "memo"],
    "Podcasts": ["podcast", "episode", "show", "interview", "talk"],
    "Recordings": ["recording", "recorded", "audio", "session", "meeting", "call"],
}

SPREADSHEET_KEYWORDS: Dict[str, List[str]] = {
    "Finance": ["finance", "financial", "budget", "expense", "income", "tax", "account", "bank", "salary", "payment"],
    "Data": ["data", "dataset", "raw", "export", "import", "database", "list", "sheet"],
    "Reports": ["report", "analysis", "summary", "dashboard", "kpi", "metrics", "statistics"],
}


def classify_file(file_path: str, filename: str = None) -> dict:
    """Main entry point: classify a file into category + subcategory.

    Returns:
        {
            "category": str,
            "subcategory": str,
            "ai_tags": List[str],
            "confidence_score": float,
            "extracted_text": Optional[str],
        }
    """
    if filename is None:
        filename = Path(file_path).name

    ext = get_extension(filename)
    name_stem = Path(filename).stem.lower()

    # 1. Determine broad category from extension
    category = _category_from_ext(ext)
    if not category:
        category = "Others"

    # 2. Extract text content if possible
    extracted_text = _extract_text(file_path, ext)

    # 3. Classify subcategory based on category
    subcategory, confidence, tags = _classify_subcategory(
        category, name_stem, extracted_text, ext, file_path
    )

    # 4. Fallback if confidence too low
    if confidence < CONFIDENCE_THRESHOLD:
        subcategory = "Others"
        confidence = confidence  # keep original for debugging

    return {
        "category": category,
        "subcategory": subcategory,
        "ai_tags": tags,
        "confidence_score": round(confidence, 4),
        "extracted_text": extracted_text,
    }


def _category_from_ext(ext: str) -> Optional[str]:
    for category, extensions in CATEGORY_MAP.items():
        if ext in extensions:
            return category
    return None


def _extract_text(file_path: str, ext: str) -> Optional[str]:
    """Extract text content from file for analysis."""
    try:
        if ext in {".pdf"}:
            return _extract_pdf_text(file_path)
        elif ext in {".docx"}:
            return _extract_docx_text(file_path)
        elif ext in {".txt", ".md", ".csv", ".json", ".xml", ".yaml", ".yml"}:
            return _extract_plain_text(file_path)
        elif ext in {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp", ".gif"}:
            return ocr_extract(file_path) or None
        elif ext in {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".wma"}:
            return _extract_audio_metadata(file_path)
        elif ext in {".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v"}:
            return _extract_video_metadata(file_path)
    except Exception as e:
        logger.debug("Text extraction failed for %s: %s", file_path, e)
    return None


def _extract_pdf_text(path: str) -> Optional[str]:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages[:20]:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n".join(text_parts)[:10000] if text_parts else None
    except ImportError:
        # fallback to OCR
        return ocr_extract(path) or None
    except Exception:
        return None


def _extract_docx_text(path: str) -> Optional[str]:
    try:
        from docx import Document
        doc = Document(path)
        text = "\n".join(p.text for p in doc.paragraphs)
        return text[:10000] if text.strip() else None
    except ImportError:
        return None
    except Exception:
        return None


def _extract_plain_text(path: str) -> Optional[str]:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read(10000)
    except Exception:
        return None


def _extract_audio_metadata(path: str) -> Optional[str]:
    try:
        import mutagen
        from mutagen.mp3 import MP3
        from mutagen.flac import FLAC
        from mutagen.oggvorbis import OggVorbis
        ext = Path(path).suffix.lower()
        metadata = {}
        try:
            if ext == ".mp3":
                audio = MP3(path)
            elif ext == ".flac":
                audio = FLAC(path)
            elif ext in {".ogg", ".oga"}:
                audio = OggVorbis(path)
            else:
                audio = mutagen.File(path)
            if audio:
                for key in ("title", "artist", "album", "genre", "tracknumber"):
                    val = audio.get(key)
                    if val:
                        metadata[key] = str(val[0]) if isinstance(val, list) else str(val)
        except Exception:
            pass
        if metadata:
            return " | ".join(f"{k}: {v}" for k, v in metadata.items())
    except ImportError:
        pass
    return None


def _extract_video_metadata(path: str) -> Optional[str]:
    try:
        import subprocess
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", "-show_streams", path],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout)
            parts = []
            fmt = data.get("format", {})
            if fmt.get("tags"):
                tags = fmt["tags"]
                for key in ("title", "artist", "genre", "description", "comment"):
                    val = tags.get(key)
                    if val:
                        parts.append(f"{key}: {val}")
            return " | ".join(parts) if parts else None
    except Exception:
        pass
    return None


def _classify_subcategory(
    category: str,
    name_stem: str,
    extracted_text: Optional[str],
    ext: str,
    file_path: str,
) -> Tuple[str, float, List[str]]:
    """Determine subcategory and generate AI tags."""
    if category == "documents":
        return _classify_document(name_stem, extracted_text, ext)
    elif category == "images":
        return _classify_image(name_stem, extracted_text, ext, file_path)
    elif category == "videos":
        return _classify_video(name_stem, extracted_text, ext)
    elif category == "audio":
        return _classify_audio(name_stem, extracted_text, ext)
    elif category == "spreadsheets":
        return _classify_spreadsheet(name_stem, extracted_text)
    elif category == "code":
        return _classify_code(name_stem, ext)
    elif category == "archives":
        return "Others", 0.9, ["archive", "compressed"]
    else:
        return "Others", 0.5, []


def _keyword_match(name_stem: str, text: Optional[str], keywords: Dict[str, List[str]]) -> Tuple[Optional[str], float, List[str]]:
    """Score subcategories by keyword matching against filename and text content."""
    best_sub = None
    best_score = 0.0
    all_tags = []

    for subcategory, kw_list in keywords.items():
        score = 0.0
        # Match against filename stem
        for kw in kw_list:
            if kw in name_stem:
                score += 0.3
                if kw not in all_tags:
                    all_tags.append(kw)

        # Match against extracted text
        if text:
            text_lower = text.lower()
            for kw in kw_list:
                count = text_lower.count(kw)
                if count > 0:
                    score += min(count * 0.05, 0.4)
                    if kw not in all_tags:
                        all_tags.append(kw)

        if score > best_score:
            best_score = score
            best_sub = subcategory

    # Normalize score (cap at 0.95)
    best_score = min(best_score, 0.95)
    return best_sub, best_score, all_tags[:10]


def _classify_document(name_stem: str, text: Optional[str], ext: str) -> Tuple[str, float, List[str]]:
    """Classify document subcategory using text analysis + keywords."""
    sub, score, tags = _keyword_match(name_stem, text, DOC_KEYWORDS)

    # Text-based refinement
    if text:
        text_lower = text.lower()

        # Detect resume
        resume_patterns = ["experience", "education", "skills", "work history", "objective", "summary"]
        if sum(1 for p in resume_patterns if p in text_lower) >= 3:
            if score < 0.5:
                sub = "Resume"
                score = 0.7
                tags.append("resume")

        # Detect invoices
        invoice_patterns = ["invoice", "total", "amount", "due", "payment", "$", "rs.", "tax"]
        if sum(1 for p in invoice_patterns if p in text_lower) >= 3:
            if score < 0.5:
                sub = "Invoices"
                score = 0.75
                tags.append("invoice")

        # Detect certificates
        cert_patterns = ["certificate", "award", "completed", "achievement", "this certifies"]
        if sum(1 for p in cert_patterns if p in text_lower) >= 2:
            if score < 0.5:
                sub = "Certificates"
                score = 0.7
                tags.append("certificate")

        # Detect question papers
        q_patterns = ["question", "marks", "answer", "section", "instruction", "attempt"]
        if sum(1 for p in q_patterns if p in text_lower) >= 3:
            if score < 0.5:
                sub = "Question_Papers"
                score = 0.7
                tags.append("question_paper")

        # Detect research papers
        r_patterns = ["abstract", "introduction", "methodology", "conclusion", "references", "bibliography"]
        if sum(1 for p in r_patterns if p in text_lower) >= 3:
            if score < 0.5:
                sub = "Research_Papers"
                score = 0.75
                tags.append("research")

    if sub is None:
        # Extension-based fallback
        if ext in {".txt"}:
            sub = "Notes"
            score = 0.4
            tags.append("notes")
        else:
            sub = "Others"
            score = 0.3

    tags = list(set(tags))[:10]
    return sub, score, tags


def _classify_image(name_stem: str, text: Optional[str], ext: str, file_path: str) -> Tuple[str, float, List[str]]:
    """Classify image subcategory using OCR, EXIF, and filename analysis."""
    sub, score, tags = _keyword_match(name_stem, text, IMAGE_KEYWORDS)

    # OCR-based detection
    if text:
        text_lower = text.lower()

        # Receipt detection
        receipt_patterns = ["total", "receipt", "bill", "amount", "payment", "cash", "store", "shop", "$", "rs."]
        if sum(1 for p in receipt_patterns if p in text_lower) >= 3:
            if score < 0.5:
                sub = "Receipts"
                score = 0.8
                tags.append("receipt")

        # Document scan detection
        doc_patterns = ["name", "date", "address", "number", "signature", "form", "application"]
        if sum(1 for p in doc_patterns if p in text_lower) >= 3:
            if score < 0.5:
                sub = "Documents_Scans"
                score = 0.7
                tags.append("document_scan")

    # EXIF-based detection
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS as EXIF_TAGS
        img = Image.open(file_path)

        # Screenshot detection: check dimensions and lack of EXIF
        width, height = img.size
        has_exif = bool(img.getexif())

        # Common screenshot resolutions
        screen_resolutions = [
            (1920, 1080), (1366, 768), (1440, 900), (1536, 864),
            (1280, 720), (2560, 1440), (3840, 2160),
        ]
        if (width, height) in screen_resolutions and not has_exif:
            if score < 0.5:
                sub = "Screenshots"
                score = 0.85
                tags.append("screenshot")

        # Profile photo detection: small square images
        if abs(width - height) < 10 and width < 500 and has_exif:
            if score < 0.5:
                sub = "Profile_Photos"
                score = 0.6
                tags.append("profile")

        # Detect nature: check color palette (simple heuristic)
        if width > 800 and height > 600 and has_exif:
            # Check if it has camera EXIF data
            exif = img.getexif()
            if exif:
                for tag_id, value in exif.items():
                    tag_name = EXIF_TAGS.get(tag_id, "")
                    if tag_name == "Make" or tag_name == "Model":
                        if score < 0.5:
                            sub = "Nature"
                            score = 0.5
                            tags.append("photograph")
                        break

        img.close()
    except Exception:
        pass

    if sub is None:
        sub = "Others"
        score = 0.3

    tags = list(set(tags))[:10]
    return sub, score, tags


def _classify_video(name_stem: str, text: Optional[str], ext: str) -> Tuple[str, float, List[str]]:
    """Classify video subcategory using filename + metadata."""
    sub, score, tags = _keyword_match(name_stem, text, VIDEO_KEYWORDS)

    # Resolution-based detection for screen recordings
    if ext in {".mp4", ".avi", ".mov", ".webm"}:
        try:
            import subprocess
            result = subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json",
                 "-show_streams", "-select_streams", "v:0"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                import json
                data = json.loads(result.stdout)
                streams = data.get("streams", [])
                if streams:
                    w = streams[0].get("width", 0)
                    h = streams[0].get("height", 0)
                    # Screen recordings are typically 1920x1080 or 1366x768
                    if (w, h) in [(1920, 1080), (1366, 768), (1440, 900), (1280, 720)]:
                        if score < 0.5:
                            sub = "Screen_Recordings"
                            score = 0.6
                            tags.append("screen_recording")
        except Exception:
            pass

    if sub is None:
        sub = "Others"
        score = 0.3

    tags = list(set(tags))[:10]
    return sub, score, tags


def _classify_audio(name_stem: str, text: Optional[str], ext: str) -> Tuple[str, float, List[str]]:
    """Classify audio subcategory using filename + metadata."""
    sub, score, tags = _keyword_match(name_stem, text, AUDIO_KEYWORDS)

    # Extension-based hints
    if ext in {".wav"} and score < 0.4:
        sub = "Voice_Notes"
        score = 0.5
        tags.append("voice")

    if sub is None:
        sub = "Others"
        score = 0.3

    tags = list(set(tags))[:10]
    return sub, score, tags


def _classify_spreadsheet(name_stem: str, text: Optional[str]) -> Tuple[str, float, List[str]]:
    sub, score, tags = _keyword_match(name_stem, text, SPREADSHEET_KEYWORDS)

    if sub is None:
        sub = "Others"
        score = 0.3

    tags = list(set(tags))[:10]
    return sub, score, tags


def _classify_code(name_stem: str, ext: str) -> Tuple[str, float, List[str]]:
    lang_tags = {
        ".py": "python", ".js": "javascript", ".ts": "typescript",
        ".tsx": "typescript", ".jsx": "react", ".java": "java",
        ".cpp": "cpp", ".c": "c", ".h": "header", ".cs": "csharp",
        ".go": "golang", ".rs": "rust", ".rb": "ruby", ".php": "php",
        ".html": "html", ".css": "css", ".json": "json", ".xml": "xml",
        ".yaml": "yaml", ".yml": "yaml", ".sql": "sql", ".sh": "shell",
        ".bat": "batch", ".ps1": "powershell",
    }
    lang = lang_tags.get(ext, "code")
    sub = lang.capitalize()
    return sub, 0.8, [lang, "code"]


def batch_classify(files: List[Dict]) -> List[Dict]:
    """Classify multiple files. Each dict must have 'file_path' and optionally 'filename'."""
    results = []
    for f in files:
        try:
            result = classify_file(f["file_path"], f.get("filename"))
            results.append(result)
        except Exception as e:
            logger.error("Classification failed for %s: %s", f.get("file_path"), e)
            results.append({
                "category": "Others",
                "subcategory": "Others",
                "ai_tags": [],
                "confidence_score": 0.0,
                "extracted_text": None,
            })
    return results


# ── Category/subcategory lookup helpers ─────────────────────────────────────

CATEGORY_TREE = {
    "documents": DOCUMENT_SUBCATEGORIES,
    "images": IMAGE_SUBCATEGORIES,
    "videos": VIDEO_SUBCATEGORIES,
    "audio": AUDIO_SUBCATEGORIES,
    "spreadsheets": SPREADSHEET_SUBCATEGORIES,
    "archives": ["Others"],
    "code": ["Python", "Javascript", "Typescript", "Java", "Cpp", "C", "Csharp", "Golang", "Rust", "Ruby", "Php", "Html", "Css", "Json", "Xml", "Yaml", "Sql", "Shell", "Batch", "Powershell", "React", "Header", "Code"],
    "Others": ["Others"],
}


def get_all_categories() -> List[str]:
    return list(CATEGORY_TREE.keys())


def get_subcategories(category: str) -> List[str]:
    return CATEGORY_TREE.get(category, ["Others"])


def get_all_subcategories() -> Dict[str, List[str]]:
    return dict(CATEGORY_TREE)
