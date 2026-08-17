"""
Chat request/response schemas.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field

from app.models.chat import MessageRole


class Citation(BaseModel):
    chunk_id: int
    document_id: int
    document_title: str
    page_number: Optional[int] = None
    quote: str = ""


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=10000)
    session_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    id: int
    role: MessageRole
    content: str
    citations: Optional[List[Citation]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]


class SessionDetailResponse(BaseModel):
    session: SessionResponse
    messages: List[ChatMessageResponse]
