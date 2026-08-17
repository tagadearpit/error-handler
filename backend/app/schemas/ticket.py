"""
Escalation ticket request/response schemas.
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel

from app.models.ticket import TicketStatus


class TicketCreate(BaseModel):
    query: str
    session_id: Optional[int] = None
    department: Optional[str] = None


class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    assigned_to: Optional[str] = None
    resolution_note: Optional[str] = None


class TicketResponse(BaseModel):
    id: int
    session_id: Optional[int]
    user_id: int
    query: str
    status: TicketStatus
    department: Optional[str]
    assigned_to: Optional[str]
    resolution_note: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TicketListResponse(BaseModel):
    tickets: List[TicketResponse]
    total: int
