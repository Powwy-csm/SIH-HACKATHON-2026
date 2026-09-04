"""
Central configuration. All secrets come from environment variables only —
nothing here is hardcoded, and the service_role key is never returned to
the frontend or logged.
"""
import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Supabase project URL, e.g. https://xxxx.supabase.co
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")

    # Public anon key — safe to use client-side too. Used server-side here
    # to build a JWT-scoped client that respects RLS for student reads.
    SUPABASE_ANON_KEY: str = os.environ.get("SUPABASE_ANON_KEY", "")

    # Service role key — bypasses RLS entirely. MUST stay server-side only.
    # Used for the specific writes to `recommendations` and `skill_gaps`
    # where RLS makes students read-only, and (Phase 1) for all resume
    # storage/table writes in app/services/resume_service.py — the
    # student's own id is always taken from their verified JWT
    # (app/deps/auth.py), never trusted from client input, so this does
    # not weaken the "students can only touch their own resume" guarantee.
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    # CORS: the deployed Student portal origin(s), comma-separated.
    FRONTEND_ORIGINS: list[str] = [
        o.strip()
        for o in os.environ.get("FRONTEND_ORIGINS", "http://localhost:5500").split(",")
        if o.strip()
    ]

    # Matching engine tuning (kept out of business logic so it's easy to tune
    # without touching the algorithm code).
    IMPORTANCE_WEIGHTS: dict = {"low": 1.0, "medium": 2.0, "high": 3.0}
    GAP_PRIORITY_HIGH_THRESHOLD: float = 40.0
    GAP_PRIORITY_MEDIUM_THRESHOLD: float = 15.0

    # ---------------------------------------------------------------
    # Phase 1: Resume pipeline (app/services/resume_service.py)
    # ---------------------------------------------------------------
    # Private Storage bucket created by supabase/05_ai_schema.sql.
    SUPABASE_STORAGE_BUCKET: str = os.environ.get("SUPABASE_STORAGE_BUCKET", "student-documents")

    # Hard cap enforced by the backend BEFORE the file is read fully into
    # memory (streamed/chunked check). Keep in sync with the
    # `file_size_limit` set on the bucket in 05_ai_schema.sql — that's a
    # second, independent enforcement point at the Supabase Storage layer.
    RESUME_MAX_FILE_SIZE_BYTES: int = int(os.environ.get("RESUME_MAX_FILE_SIZE_BYTES", str(10 * 1024 * 1024)))  # 10 MB

    # Only these are accepted; checked by extension AND file-signature
    # (magic bytes), never by filename/content-type alone.
    RESUME_ALLOWED_FILE_TYPES: tuple = ("pdf", "docx")

    # Defensive cap so a pathological document can't write unbounded text
    # into Postgres. Generous for a resume (a resume is a few KB of text).
    MAX_EXTRACTED_TEXT_CHARS: int = int(os.environ.get("MAX_EXTRACTED_TEXT_CHARS", "200000"))

    # How long a signed download URL for a resume stays valid. Never
    # persisted — generated fresh on each API response.
    RESUME_SIGNED_URL_EXPIRY_SECONDS: int = int(os.environ.get("RESUME_SIGNED_URL_EXPIRY_SECONDS", "3600"))

    # OCR fallback for scanned/image-based PDFs. OCR is only attempted for
    # pages whose native PDF text extraction is below the configured threshold.
    OCR_MIN_PAGE_TEXT_CHARS: int = int(os.environ.get("OCR_MIN_PAGE_TEXT_CHARS", "40"))
    OCR_MIN_DOCUMENT_TEXT_CHARS: int = int(os.environ.get("OCR_MIN_DOCUMENT_TEXT_CHARS", "80"))
    OCR_RENDER_SCALE: float = float(os.environ.get("OCR_RENDER_SCALE", "2.0"))
    OCR_PAGE_TIMEOUT_SECONDS: int = int(os.environ.get("OCR_PAGE_TIMEOUT_SECONDS", "30"))
    OCR_TESSERACT_LANG: str = os.environ.get("OCR_TESSERACT_LANG", "eng")
    OCR_TESSERACT_CONFIG: str = os.environ.get("OCR_TESSERACT_CONFIG", "--psm 6")

    # ---------------------------------------------------------------
    # Phase 2: AI skill extraction + embeddings
    # (app/deps/ai_clients.py, app/services/skill_extraction_service.py,
    #  app/services/skill_normalization_service.py, app/services/embedding_service.py)
    # ---------------------------------------------------------------
    # Which AIProvider implementation app/deps/ai_clients.get_ai_provider()
    # constructs. Currently supported: "gemini". Add a new provider class
    # in ai_clients.py, then add its name here, to support another vendor.
    AI_PROVIDER: str = os.environ.get("AI_PROVIDER", "gemini")

    # Gemini-specific settings. Only read/used when AI_PROVIDER=gemini.
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
    GEMINI_SKILL_EXTRACTION_MODEL: str = os.environ.get("GEMINI_SKILL_EXTRACTION_MODEL", "gemini-3.5-flash")
    GEMINI_EMBEDDING_MODEL: str = os.environ.get("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2")

    # MUST match the `vector(N)` dimension in supabase/07_ai_embeddings.sql
    # (student_embeddings.embedding). 768 is correct for Gemini's
    # text-embedding-004. If you change the embedding model/provider to one
    # with a different output dimension, update BOTH this value and the SQL
    # column — a mismatch fails loudly at generation time
    # (see ai_clients.GeminiProvider.generate_embedding), never silently.
    EMBEDDING_DIMENSIONS: int = int(os.environ.get("EMBEDDING_DIMENSIONS", "768"))

    # Normalization pipeline tuning.
    SKILL_FUZZY_MATCH_THRESHOLD: int = int(os.environ.get("SKILL_FUZZY_MATCH_THRESHOLD", "88"))  # 0-100, rapidfuzz score
    SKILL_MIN_NORMALIZATION_CONFIDENCE: float = float(os.environ.get("SKILL_MIN_NORMALIZATION_CONFIDENCE", "0.6"))  # 0-1

    # Conservative default applied to a NEW ai_estimated student_skills row,
    # or used as the floor when "topping up" an existing unverified row
    # (never used to lower an existing score — see skill_normalization_service).
    # The AI extractor has no reliable signal for proficiency level, so this
    # deliberately stays low/generic rather than guessing.
    AI_SKILL_DEFAULT_PROFICIENCY_SCORE: float = float(os.environ.get("AI_SKILL_DEFAULT_PROFICIENCY_SCORE", "25.0"))
    AI_SKILL_DEFAULT_PROFICIENCY_LABEL: str = os.environ.get("AI_SKILL_DEFAULT_PROFICIENCY_LABEL", "beginner")


@lru_cache
def get_settings() -> Settings:
    return Settings()
