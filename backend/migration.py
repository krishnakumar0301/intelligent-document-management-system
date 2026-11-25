"""Database migration script for FileOracle AI upgrade.

Adds new columns and reclassifies existing files using AI.
Run: python migration.py
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("migration")

# ── Import app modules ──────────────────────────────────────────────────────
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./data/fileoracle.db")

from sqlalchemy import text, select
from app.database.session import engine, AsyncSessionLocal, init_db
from app.database.base import Base
from app.models.file_record import FileRecord, JSONList
from app.services.ai_classifier import classify_file


async def run_migration():
    logger.info("=" * 60)
    logger.info("FileOracle AI Upgrade Migration")
    logger.info("=" * 60)

    # Step 1: Add new columns if they don't exist
    logger.info("\n[1/4] Adding new schema columns...")
    async with engine.begin() as conn:
        # Check existing columns
        result = await conn.execute(text("PRAGMA table_info(file_records)"))
        existing_cols = {row[1] for row in result.fetchall()}

        additions = {
            "subcategory": "VARCHAR(50)",
            "extracted_text": "TEXT",
            "ai_tags": "TEXT DEFAULT '[]'",
            "ai_confidence_score": "FLOAT",
        }

        for col, col_type in additions.items():
            if col not in existing_cols:
                logger.info(f"  + Adding column: {col}")
                await conn.execute(text(f"ALTER TABLE file_records ADD COLUMN {col} {col_type}"))
            else:
                logger.info(f"  ~ Column already exists: {col}")

        # Ensure spreadsheet category exists in table
        await conn.commit()

    # Step 2: Initialize tables (adds new models if any)
    logger.info("\n[2/4] Ensuring all tables exist...")
    await init_db()
    logger.info("  OK")

    # Step 3: Reclassify existing files
    logger.info("\n[3/4] Running AI classification on existing files...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(FileRecord).where(FileRecord.is_deleted == False)
        )
        records = list(result.scalars().all())
        logger.info(f"  Found {len(records)} file(s) to classify")

        classified = 0
        errors = 0

        for i, rec in enumerate(records):
            if not os.path.isfile(rec.path):
                logger.debug(f"  Skipping (not on disk): {rec.path}")
                continue

            try:
                result = classify_file(rec.path, rec.name)
                rec.category = result["category"]
                rec.subcategory = result["subcategory"]
                rec.ai_tags = result["ai_tags"]
                rec.ai_confidence_score = result["confidence_score"]
                if result["extracted_text"]:
                    rec.extracted_text = result["extracted_text"]
                classified += 1
            except Exception as e:
                logger.warning(f"  Error classifying {rec.name}: {e}")
                rec.subcategory = "Others"
                rec.ai_tags = []
                rec.ai_confidence_score = 0.0
                errors += 1

            if (i + 1) % 50 == 0:
                logger.info(f"  Progress: {i + 1}/{len(records)} classified")
                await db.flush()

        await db.commit()
        logger.info(f"  Classified: {classified}, Errors: {errors}")

    # Step 4: Summary
    logger.info("\n[4/4] Migration complete!")
    logger.info("=" * 60)
    logger.info("New features enabled:")
    logger.info("  - AI-powered subcategory classification")
    logger.info("  - AI auto-tagging with confidence scores")
    logger.info("  - Extracted text for content search")
    logger.info("  - Structured storage at backend/storage/")
    logger.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_migration())
