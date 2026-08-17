"""
FastAPI application entrypoint.
"""

import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import api_router
from app.core.config import settings
from app.core.database import init_pgvector

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-30s | %(levelname)-7s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 Starting AI Helpdesk Backend...")
    await init_pgvector()

    # Validate embedding model is reachable
    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
        result = genai.embed_content(
            model=f"models/{settings.GEMINI_EMBEDDING_MODEL}",
            content="startup validation test",
            task_type="retrieval_document",
            output_dimensionality=settings.EMBEDDING_DIMENSION,
        )
        dim = len(result["embedding"])
        logger.info(
            f"✅ Embedding model '{settings.GEMINI_EMBEDDING_MODEL}' validated "
            f"(returned {dim}-dim vector)"
        )
    except Exception as e:
        logger.critical(
            f"FATAL: Embedding model '{settings.GEMINI_EMBEDDING_MODEL}' is not reachable "
            f"with the configured API key. Check GEMINI_API_KEY and GEMINI_EMBEDDING_MODEL. "
            f"Error: {e}"
        )
        # Don't hard-exit — allow the server to start so health checks / docs work,
        # but log clearly so the operator sees the problem immediately.

    # Automatically run seed (creating tables + demo users) on startup
    try:
        import sys
        import os
        # Add backend root to path to import seed.py
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from seed import seed
        await seed()
        logger.info("✅ Tables created and data seeded automatically!")
    except Exception as e:
        logger.error(f"Failed to auto-seed: {e}")

    logger.info("✅ Backend ready")
    yield
    logger.info("👋 Shutting down AI Helpdesk Backend...")


# ── App ──
app = FastAPI(
    title="AI Helpdesk API",
    description="Smart College/Business Assistant — RAG-powered helpdesk API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──
app.include_router(api_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "ai-helpdesk"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
    )
