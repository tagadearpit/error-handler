"""
Vector retrieval service with RBAC filtering and re-ranking.
"""

import logging
from typing import List, Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chunk import DocumentChunk
from app.models.document import Document, AccessLevel
from app.models.user import UserRole
from app.services.embedding import generate_single_embedding
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Access Level Mapping ──
# Each role can access documents at or below their access level
ROLE_ACCESS_MAP: dict[str, list[str]] = {
    UserRole.student: [AccessLevel.public, AccessLevel.student],
    UserRole.faculty: [AccessLevel.public, AccessLevel.student, AccessLevel.faculty],
    UserRole.support: [AccessLevel.public, AccessLevel.student, AccessLevel.faculty, AccessLevel.support],
    UserRole.admin: [AccessLevel.public, AccessLevel.student, AccessLevel.faculty, AccessLevel.support, AccessLevel.admin],
}


async def retrieve_relevant_chunks(
    db: AsyncSession,
    query: str,
    user_role: str,
    user_department: Optional[str] = None,
    top_k: int = 15,
    top_n: int = 4,
) -> List[dict]:
    """
    Hybrid retrieval pipeline:
    1. Generate query embedding
    2. Cosine similarity search on document_chunks (top_k)
    3. RBAC filtering by user role and department
    4. Re-rank to top_n most relevant chunks
    """
    # Step 1: Generate query embedding
    query_embedding = await generate_single_embedding(query)

    # Step 2: Determine allowed access levels
    allowed_levels = ROLE_ACCESS_MAP.get(user_role, [AccessLevel.public])
    allowed_level_values = [level.value if hasattr(level, 'value') else level for level in allowed_levels]

    # Step 3: Vector similarity search with RBAC filter
    # Using pgvector's cosine distance operator (<=>)
    embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

    query_sql = text("""
        SELECT
            dc.id,
            dc.document_id,
            dc.chunk_index,
            dc.content,
            dc.page_number,
            dc.metadata,
            d.title AS document_title,
            d.access_level,
            d.department,
            (dc.embedding <=> CAST(:embedding AS vector)) AS distance
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE d.access_level = ANY(:allowed_levels)
          AND d.status = 'processed'
          AND dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> CAST(:embedding AS vector)
        LIMIT :top_k
    """)

    result = await db.execute(
        query_sql,
        {
            "embedding": embedding_str,
            "allowed_levels": allowed_level_values,
            "top_k": top_k,
        },
    )

    rows = result.fetchall()

    if not rows:
        logger.info("No relevant chunks found for query")
        return []

    # Step 4: Re-rank — simple relevance scoring
    # For production, use a cross-encoder model. Here we use distance-based ranking.
    candidates = []
    for row in rows:
        score = 1.0 - float(row.distance)  # Convert distance to similarity

        # Boost department match
        if user_department and row.department and row.department.lower() == user_department.lower():
            score += 0.05

        candidates.append({
            "chunk_id": row.id,
            "document_id": row.document_id,
            "document_title": row.document_title,
            "content": row.content,
            "page_number": row.page_number,
            "chunk_index": row.chunk_index,
            "metadata": row.metadata or {},
            "score": round(score, 4),
        })

    # Sort by score descending and take top_n
    candidates.sort(key=lambda x: x["score"], reverse=True)
    
    # Filter by threshold
    threshold = settings.RETRIEVAL_SIMILARITY_THRESHOLD
    top_chunks = [c for c in candidates[:top_n] if c["score"] >= threshold]

    if not top_chunks and candidates:
        logger.warning(f"Best chunk score {candidates[0]['score']} is below threshold {threshold}. Discarding chunks.")

    logger.info(
        f"Retrieved {len(rows)} candidates, re-ranked to top {len(top_chunks)} "
        f"(scores: {[c['score'] for c in top_chunks]})"
    )

    return top_chunks
