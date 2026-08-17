"""
Models package — re-exports all ORM models for Alembic discovery.
"""

from app.core.database import Base
from app.models.user import User, UserRole
from app.models.document import Document, AccessLevel, DocumentStatus
from app.models.chunk import DocumentChunk
from app.models.chat import ChatSession, ChatMessage, MessageRole
from app.models.ticket import EscalationTicket, TicketStatus

__all__ = [
    "Base",
    "User",
    "UserRole",
    "Document",
    "AccessLevel",
    "DocumentStatus",
    "DocumentChunk",
    "ChatSession",
    "ChatMessage",
    "MessageRole",
    "EscalationTicket",
    "TicketStatus",
]
