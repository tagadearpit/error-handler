"""
Google Gemini embedding generation service.
"""

import logging
from typing import List

import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Configure Gemini ──
genai.configure(api_key=settings.GEMINI_API_KEY)


async def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of text strings using Google Gemini.
    Batches in groups of 100 (Gemini limit).
    """
    if not texts:
        return []

    embeddings: List[List[float]] = []
    batch_size = 100  # Gemini batch limit

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        try:
            result = genai.embed_content(
                model=f"models/{settings.GEMINI_EMBEDDING_MODEL}",
                content=batch,
                task_type="retrieval_document",
                output_dimensionality=settings.EMBEDDING_DIMENSION,
            )
            # Result contains 'embedding' for single or list of embeddings for batch
            if isinstance(result["embedding"][0], list):
                embeddings.extend(result["embedding"])
            else:
                embeddings.append(result["embedding"])

            logger.info(f"Generated embeddings for batch {i // batch_size + 1} ({len(batch)} texts)")
        except Exception as e:
            logger.error(f"Gemini embedding API error: {e}")
            raise

    return embeddings


async def generate_single_embedding(text: str) -> List[float]:
    """Generate a single embedding vector for a query string."""
    try:
        result = genai.embed_content(
            model=f"models/{settings.GEMINI_EMBEDDING_MODEL}",
            content=text,
            task_type="retrieval_query",
            output_dimensionality=settings.EMBEDDING_DIMENSION,
        )
        return result["embedding"]
    except Exception as e:
        logger.error(f"Gemini embedding error: {e}")
        raise
