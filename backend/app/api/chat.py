"""
Chat API endpoints with SSE streaming support.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.chat import ChatMessage, ChatSession, MessageRole
from app.models.ticket import EscalationTicket, TicketStatus
from app.models.user import User
from app.schemas.chat import (
    ChatMessageResponse,
    ChatRequest,
    Citation,
    SessionDetailResponse,
    SessionListResponse,
    SessionResponse,
)
from app.services.llm import (
    extract_citations_from_response,
    generate_session_title,
    rewrite_query,
    stream_grounded_response,
)
from app.services.retrieval import retrieve_relevant_chunks

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chat"])


# ─────────────────────────────────────────────
# Chat Completions (SSE Streaming)
# ─────────────────────────────────────────────

@router.post("/chat/completions")
async def chat_completions(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Stream a RAG-grounded chat completion via Server-Sent Events.
    Creates a new session if session_id is not provided.
    """
    session_id = payload.session_id

    # Create or get session
    if session_id:
        session = await db.get(ChatSession, session_id)
        if not session or session.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    else:
        # Create new session
        title = await generate_session_title(payload.message)
        session = ChatSession(
            user_id=current_user.id,
            title=title,
        )
        db.add(session)
        await db.flush()
        await db.refresh(session)
        session_id = session.id

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        role=MessageRole.user,
        content=payload.message,
    )
    db.add(user_msg)
    await db.flush()

    # Load chat history
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    history_messages = history_result.scalars().all()
    chat_history = [
        {"role": msg.role.value, "content": msg.content}
        for msg in history_messages[-10:]  # last 10 messages
    ]

    # Rewrite query for retrieval
    rewritten_query = await rewrite_query(payload.message, chat_history[:-1])

    # Retrieve relevant chunks with RBAC
    chunks = await retrieve_relevant_chunks(
        db=db,
        query=rewritten_query,
        user_role=current_user.role.value,
        user_department=current_user.department,
        top_k=15,
        top_n=4,
    )

    # Stream response via SSE
    async def event_stream():
        # Send session info first
        session_data = json.dumps({"type": "session", "session_id": session_id})
        yield f"data: {session_data}\n\n"

        is_escalation = False
        full_response = ""
        citations = []

        # If no relevant chunks, escalate immediately (P0-6)
        if not chunks:
            is_escalation = True
        else:
            # P0-3: Structured decision first
            from app.services.llm import generate_structured_response
            decision = await generate_structured_response(
                user_message=payload.message,
                chunks=chunks,
                chat_history=chat_history[:-1],
            )
            if not decision.get("answerable"):
                is_escalation = True

        if is_escalation:
            # Send clean escalation message directly
            clean_message = "I don't have that information in our knowledge base — I've escalated your question to our support team."
            token_data = json.dumps({"type": "token", "content": clean_message})
            yield f"data: {token_data}\n\n"
            full_response = clean_message

            # Create escalation ticket
            ticket = EscalationTicket(
                session_id=session_id,
                user_id=current_user.id,
                query=payload.message,
                department=current_user.department,
                status=TicketStatus.open,
            )
            db.add(ticket)
            await db.flush()
            await db.refresh(ticket)

            escalation_data = json.dumps({
                "type": "escalation",
                "ticket_id": ticket.id,
                "message": f"Your query has been escalated to our support team. Ticket #{ticket.id}",
            })
            yield f"data: {escalation_data}\n\n"
            logger.info(f"Auto-escalation triggered: ticket #{ticket.id} for user {current_user.id}")
            
        else:
            # Stream the actual answer
            async for token in stream_grounded_response(
                user_message=payload.message,
                chunks=chunks,
                chat_history=chat_history[:-1],
            ):
                full_response += token
                if token:
                    token_data = json.dumps({"type": "token", "content": token})
                    yield f"data: {token_data}\n\n"

            # P0-5: Extract and send citations AFTER the response is complete
            citations = extract_citations_from_response(full_response, chunks)
            if citations:
                citations_data = json.dumps({
                    "type": "citations",
                    "citations": citations,
                })
                yield f"data: {citations_data}\n\n"

        # Save assistant message
        assistant_msg = ChatMessage(
            session_id=session_id,
            role=MessageRole.assistant,
            content=full_response,
            citations=citations if citations else None,
        )
        db.add(assistant_msg)
        await db.commit()

        # Send completion signal
        done_data = json.dumps({"type": "done", "message_id": assistant_msg.id})
        yield f"data: {done_data}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ─────────────────────────────────────────────
# Session Management
# ─────────────────────────────────────────────

@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all chat sessions for the current user."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    sessions = result.scalars().all()

    session_responses = []
    for session in sessions:
        # Count messages
        count_result = await db.execute(
            select(func.count(ChatMessage.id)).where(ChatMessage.session_id == session.id)
        )
        msg_count = count_result.scalar() or 0

        resp = SessionResponse(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=msg_count,
        )
        session_responses.append(resp)

    return SessionListResponse(sessions=session_responses)


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a chat session with all messages."""
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    # Load messages
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    count_result = await db.execute(
        select(func.count(ChatMessage.id)).where(ChatMessage.session_id == session.id)
    )
    msg_count = count_result.scalar() or 0

    return SessionDetailResponse(
        session=SessionResponse(
            id=session.id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            message_count=msg_count,
        ),
        messages=[
            ChatMessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                citations=[Citation(**c) for c in (msg.citations or [])],
                created_at=msg.created_at,
            )
            for msg in messages
        ],
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a chat session and all its messages."""
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    await db.delete(session)
    logger.info(f"Session {session_id} deleted by user {current_user.id}")
