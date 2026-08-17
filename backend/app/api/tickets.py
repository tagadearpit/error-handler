"""
Escalation ticket API endpoints.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.ticket import EscalationTicket
from app.models.user import User
from app.schemas.ticket import TicketListResponse, TicketResponse, TicketUpdate

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Tickets"])


@router.get("/admin/tickets", response_model=TicketListResponse)
async def list_all_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "support")),
):
    """List all escalation tickets. Admin/Support only."""
    result = await db.execute(
        select(EscalationTicket).order_by(EscalationTicket.created_at.desc())
    )
    tickets = result.scalars().all()

    return TicketListResponse(
        tickets=[TicketResponse.model_validate(t) for t in tickets],
        total=len(tickets),
    )


@router.patch("/admin/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    payload: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "support")),
):
    """Update a ticket's status, assignment, or resolution. Admin/Support only."""
    ticket = await db.get(EscalationTicket, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if payload.status is not None:
        ticket.status = payload.status
    if payload.assigned_to is not None:
        ticket.assigned_to = payload.assigned_to
    if payload.resolution_note is not None:
        ticket.resolution_note = payload.resolution_note

    await db.flush()
    await db.refresh(ticket)

    logger.info(f"Ticket {ticket_id} updated by {current_user.email}")
    return TicketResponse.model_validate(ticket)


@router.get("/tickets/mine", response_model=TicketListResponse)
async def list_my_tickets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List tickets created by the current user."""
    result = await db.execute(
        select(EscalationTicket)
        .where(EscalationTicket.user_id == current_user.id)
        .order_by(EscalationTicket.created_at.desc())
    )
    tickets = result.scalars().all()

    return TicketListResponse(
        tickets=[TicketResponse.model_validate(t) for t in tickets],
        total=len(tickets),
    )
