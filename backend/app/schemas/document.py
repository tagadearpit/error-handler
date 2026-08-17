"""
Document request/response schemas.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

from app.models.document import AccessLevel, DocumentStatus


class DocumentUploadMeta(BaseModel):
    title: str
    access_level: AccessLevel = AccessLevel.public
    department: Optional[str] = None


class DocumentResponse(BaseModel):
    id: int
    title: str
    filename: str
    mime_type: str
    access_level: AccessLevel
    department: Optional[str]
    status: DocumentStatus
    chunk_count: int
    uploaded_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
