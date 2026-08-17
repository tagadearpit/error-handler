"""
End-to-end document ingestion pipeline.
Orchestrates: file save → extract → chunk → embed → store.
"""

import logging
import os
import shutil
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.chunk import DocumentChunk
from app.models.document import Document, DocumentStatus
from app.services.chunking import extract_text, chunk_document
from app.services.embedding import generate_embeddings

logger = logging.getLogger(__name__)


async def save_upload_file(
    file_content: bytes,
    filename: str,
) -> str:
    """Save uploaded file to disk and return the file path."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Generate unique filename to avoid collisions
    import uuid
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    with open(file_path, "wb") as f:
        f.write(file_content)

    logger.info(f"File saved: {file_path}")
    return file_path


async def ingest_document(
    db: AsyncSession,
    document_id: int,
) -> None:
    """
    Run the full ingestion pipeline for a document:
    1. Extract text (with page numbers)
    2. Chunk text (recursive, 500 tokens, 50 overlap)
    3. Generate embeddings
    4. Store chunks in DB
    5. Update document status
    """
    # Fetch document
    document = await db.get(Document, document_id)
    if not document:
        logger.error(f"Document {document_id} not found")
        return

    try:
        logger.info(f"Starting ingestion for document {document_id}: {document.title}")

        # Transition to processing
        document.status = DocumentStatus.processing
        await db.commit()
        await db.refresh(document)

        # Ephemeral storage fallback (P1-8)
        if not os.path.exists(document.file_path):
            if document.file_content:
                logger.info(f"File missing from disk. Restoring {document.filename} from DB.")
                os.makedirs(os.path.dirname(document.file_path), exist_ok=True)
                with open(document.file_path, "wb") as f:
                    f.write(document.file_content)
            else:
                raise FileNotFoundError(f"File {document.file_path} not found and no DB backup exists.")
        
        # Backup to DB if not present
        if not document.file_content:
            with open(document.file_path, "rb") as f:
                document.file_content = f.read()
            await db.commit()

        # Step 1: Extract text (offloaded to thread pool to avoid event loop blocking)
        import asyncio
        pages = await asyncio.to_thread(extract_text, document.file_path, document.mime_type)
        if not pages:
            raise ValueError("No text extracted from document")

        logger.info(f"Extracted {len(pages)} pages from {document.filename}")

        # Step 2: Chunk
        chunks = chunk_document(pages, chunk_size=500, chunk_overlap=50)
        if not chunks:
            raise ValueError("No chunks generated from document")

        logger.info(f"Generated {len(chunks)} chunks")

        # Step 3: Generate embeddings
        chunk_texts = [c["content"] for c in chunks]
        embeddings = await generate_embeddings(chunk_texts)

        logger.info(f"Generated {len(embeddings)} embeddings")

        # Step 4: Store chunks in DB
        # First, delete existing chunks for re-indexing
        from sqlalchemy import delete
        await db.execute(
            delete(DocumentChunk).where(DocumentChunk.document_id == document_id)
        )

        for chunk_data, embedding in zip(chunks, embeddings):
            db_chunk = DocumentChunk(
                document_id=document_id,
                chunk_index=chunk_data["chunk_index"],
                content=chunk_data["content"],
                embedding=embedding,
                page_number=chunk_data["page_number"],
                metadata_=chunk_data["metadata"],
            )
            db.add(db_chunk)

        # Step 5: Update document status
        document.status = DocumentStatus.processed
        document.chunk_count = len(chunks)
        await db.commit()

        logger.info(f"Document {document_id} ingested successfully: {len(chunks)} chunks stored")

    except Exception as e:
        logger.error(f"Ingestion failed for document {document_id}: {e}")
        document.status = DocumentStatus.failed
        await db.commit()
        raise
