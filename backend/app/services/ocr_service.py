"""Optional OCR for images and PDFs using Tesseract (local)."""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_tesseract_available: bool | None = None


def is_tesseract_available() -> bool:
    global _tesseract_available
    if _tesseract_available is not None:
        return _tesseract_available
    try:
        import pytesseract
        from PIL import Image

        pytesseract.get_tesseract_version()
        _tesseract_available = True
    except Exception:
        _tesseract_available = False
        logger.info("Tesseract OCR not available — OCR features disabled")
    return _tesseract_available


def extract_text_from_image(path: str) -> str:
    if not is_tesseract_available():
        return ""
    try:
        import pytesseract
        from PIL import Image

        img = Image.open(path)
        return pytesseract.image_to_string(img).strip()
    except Exception as e:
        logger.warning("OCR failed for %s: %s", path, e)
        return ""


def extract_text_from_file(path: str) -> str:
    ext = Path(path).suffix.lower()
    if ext in {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp", ".gif"}:
        return extract_text_from_image(path)
    # PDF would need pdf2image — keep simple for beginner setup
    return ""
