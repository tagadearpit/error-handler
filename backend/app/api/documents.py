"""
Document management API endpoints (admin).
"""

import logging
import os
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, BackgroundTasks
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.document import AccessLevel, Document, DocumentStatus
from app.models.chunk import DocumentChunk
from app.models.user import User
from app.schemas.document import DocumentListResponse, DocumentResponse, DocumentUploadMeta
from app.services.ingestion import ingest_document, save_upload_file

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/documents", tags=["Documents"])

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
}


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    access_level: str = Form("public"),
    department: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "support")),
):
    """Upload a document for indexing. Admin/Support only."""
    # Validate MIME type
    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {content_type}. Allowed: PDF, DOCX, TXT, Markdown",
        )

    # Validate file size
    content = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB}MB",
        )

    # Save file
    file_path = await save_upload_file(content, file.filename or "upload")

    # Parse access level
    try:
        parsed_access = AccessLevel(access_level)
    except ValueError:
        parsed_access = AccessLevel.public

    # Create document record
    document = Document(
        title=title,
        filename=file.filename or "upload",
        file_path=file_path,
        mime_type=content_type,
        access_level=parsed_access,
        department=department,
        status=DocumentStatus.pending,
        uploaded_by=current_user.id,
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)

    # Trigger background ingestion
    background_tasks.add_task(_run_ingestion, document.id)

    logger.info(f"Document uploaded: {document.title} (id={document.id})")
    return DocumentResponse.model_validate(document)


async def _run_ingestion(document_id: int):
    """Run document ingestion in background."""
    from app.core.database import async_session_factory
    async with async_session_factory() as db:
        try:
            await ingest_document(db, document_id)
        except Exception as e:
            logger.error(f"Background ingestion failed for doc {document_id}: {e}")
            # Ensure failure state is always recorded even if ingestion crashed completely
            doc = await db.get(Document, document_id)
            if doc:
                doc.status = DocumentStatus.failed
                await db.commit()


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "support")),
):
    """List all documents. Admin/Support only."""
    result = await db.execute(
        select(Document).order_by(Document.created_at.desc())
    )
    documents = result.scalars().all()

    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(d) for d in documents],
        total=len(documents),
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin")),
):
    """Delete a document and its chunks. Admin only."""
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # Delete file from disk
    if os.path.exists(document.file_path):
        os.remove(document.file_path)

    await db.delete(document)
    logger.info(f"Document deleted: {document.title} (id={document_id})")


@router.post("/{document_id}/reindex", response_model=DocumentResponse)
async def reindex_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "support")),
):
    """Re-index a document (re-extract, re-chunk, re-embed). Admin/Support only."""
    document = await db.get(Document, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document.status = DocumentStatus.pending
    document.chunk_count = 0
    await db.flush()
    await db.refresh(document)

    background_tasks.add_task(_run_ingestion, document.id)

    logger.info(f"Document re-index triggered: {document.title} (id={document_id})")
    return DocumentResponse.model_validate(document)
