"""
LLM orchestrator: query rewriting, grounded QA with citations, streaming SSE, and escalation detection.
Uses Google Gemini API (gemini-2.5-flash).
"""

import json
import logging
import re
from typing import AsyncGenerator, List, Optional

import google.generativeai as genai

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── Configure Gemini ──
genai.configure(api_key=settings.GEMINI_API_KEY)

# ─────────────────────────────────────────────
# System Prompts
# ─────────────────────────────────────────────

QUERY_REWRITE_PROMPT = """You are a query rewriting assistant. Given the conversation history and the user's latest message, rewrite the user's message into a standalone search query that captures the full intent without needing the conversation context.

Rules:
- Output ONLY the rewritten query, nothing else.
- If the latest message is already self-contained, return it as-is.
- Resolve pronouns and references using the conversation history.
"""

STRUCTURED_QA_PROMPT = """You are an AI Helpdesk Assistant for a college/business organization. Your job is to answer user questions accurately based ONLY on the provided context documents.

## STRICT RULES:
1. **Determine Answerability:** If the provided context contains enough information to accurately answer the user's question, set "answerable" to true. If the information is NOT in the provided context or you are not confident, set "answerable" to false.
2. **ONLY use information from the provided context.** Do NOT use any prior knowledge.
3. **Cite your sources** using the format `[^doc_id:page]` where `doc_id` is the document ID and `page` is the page number. Place citations inline right after the relevant statement in the "answer" field.
4. **Format your answer** using Markdown: use headings, bullet points, tables, and code blocks where appropriate.
5. **Never fabricate information.** If you're unsure, set "answerable" to false.

## RESPONSE FORMAT:
You must return a valid JSON object matching this schema:
{
  "answerable": boolean,
  "answer": "Your detailed answer goes here, with inline citations. If answerable is false, leave this empty.",
  "citations": ["[^doc_id:page]", ...] // List of unique citations you actually used in your answer.
}

## CONTEXT DOCUMENTS:
{context}

## CONVERSATION HISTORY:
{history}

Respond with JSON only."""

GROUNDED_QA_PROMPT = """You are an AI Helpdesk Assistant for a college/business organization. Your job is to answer user questions accurately based ONLY on the provided context documents.

## STRICT RULES:
1. **ONLY use information from the provided context.** Do NOT use any prior knowledge.
2. **Cite your sources** using the format `[^doc_id:page]` where `doc_id` is the document ID and `page` is the page number. Place citations inline right after the relevant statement.
3. **Format your response** using Markdown: use headings, bullet points, tables, and code blocks where appropriate.
4. **Never fabricate information.**

## CONTEXT DOCUMENTS:
{context}

## CONVERSATION HISTORY:
{history}

Answer the user's question based strictly on the above context."""

TITLE_GENERATION_PROMPT = """Generate a short, descriptive title (max 6 words) for a chat conversation that starts with this message. Output ONLY the title, nothing else."""


# ─────────────────────────────────────────────
# Query Rewriting
# ─────────────────────────────────────────────

async def rewrite_query(
    user_message: str,
    chat_history: List[dict],
) -> str:
    """Rewrite the user's query using conversation context for better retrieval."""
    if not chat_history:
        return user_message

    # Build contents for Gemini
    model = genai.GenerativeModel(
        settings.GEMINI_CHAT_MODEL,
        system_instruction=QUERY_REWRITE_PROMPT,
    )

    # Build history for Gemini format
    gemini_history = []
    for msg in chat_history[-6:]:
        role = "user" if msg["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [msg["content"]]})

    try:
        chat = model.start_chat(history=gemini_history)
        response = await chat.send_message_async(user_message)
        rewritten = response.text.strip()
        logger.info(f"Query rewritten: '{user_message}' → '{rewritten}'")
        return rewritten
    except Exception as e:
        logger.warning(f"Query rewrite failed, using original: {e}")
        return user_message


# ─────────────────────────────────────────────
# Grounded QA (Streaming)
# ─────────────────────────────────────────────

def _build_context_block(chunks: List[dict]) -> str:
    """Format retrieved chunks into a context block for the LLM."""
    if not chunks:
        return "No relevant documents found."

    blocks = []
    for chunk in chunks:
        block = (
            f"--- Document: \"{chunk['document_title']}\" "
            f"(ID: {chunk['document_id']}, Page: {chunk.get('page_number', 'N/A')}) ---\n"
            f"{chunk['content']}\n"
        )
        blocks.append(block)
    return "\n".join(blocks)


def _build_history_block(chat_history: List[dict]) -> str:
    """Format chat history for the system prompt."""
    if not chat_history:
        return "No previous messages."

    lines = []
    for msg in chat_history[-10:]:
        role_label = "User" if msg["role"] == "user" else "Assistant"
        content = msg["content"][:500] + "..." if len(msg["content"]) > 500 else msg["content"]
        lines.append(f"{role_label}: {content}")
    return "\n".join(lines)


async def generate_structured_response(
    user_message: str,
    chunks: List[dict],
    chat_history: List[dict],
) -> dict:
    """Non-streaming structured generation for answerability decision."""
    context_block = _build_context_block(chunks)
    history_block = _build_history_block(chat_history)

    system_prompt = STRUCTURED_QA_PROMPT.format(
        context=context_block,
        history=history_block,
    )

    model = genai.GenerativeModel(
        settings.GEMINI_CHAT_MODEL,
        system_instruction=system_prompt,
    )

    try:
        response = await model.generate_content_async(
            user_message,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Structured LLM failed: {e}")
        return {"answerable": False, "answer": "", "citations": []}


async def stream_grounded_response(
    user_message: str,
    chunks: List[dict],
    chat_history: List[dict],
) -> AsyncGenerator[str, None]:
    """
    Stream a grounded QA response from Gemini.
    Yields individual text chunks.
    """
    context_block = _build_context_block(chunks)
    history_block = _build_history_block(chat_history)

    system_prompt = GROUNDED_QA_PROMPT.format(
        context=context_block,
        history=history_block,
    )

    model = genai.GenerativeModel(
        settings.GEMINI_CHAT_MODEL,
        system_instruction=system_prompt,
    )

    try:
        response = await model.generate_content_async(
            user_message,
            generation_config=genai.types.GenerationConfig(
                temperature=0.2,
                max_output_tokens=2000,
            ),
            stream=True,
        )

        async for chunk in response:
            if chunk.text:
                yield chunk.text

    except Exception as e:
        logger.error(f"Gemini streaming error: {e}")
        yield f"\n\n⚠️ An error occurred while generating the response. Please try again."


async def generate_response(
    user_message: str,
    chunks: List[dict],
    chat_history: List[dict],
) -> str:
    """Non-streaming version — collects full response."""
    full_response = ""
    async for token in stream_grounded_response(user_message, chunks, chat_history):
        full_response += token
    return full_response


# ─────────────────────────────────────────────
# Title Generation
# ─────────────────────────────────────────────

async def generate_session_title(first_message: str) -> str:
    """Generate a short title for a new chat session."""
    try:
        model = genai.GenerativeModel(
            settings.GEMINI_CHAT_MODEL,
            system_instruction=TITLE_GENERATION_PROMPT,
        )
        response = await model.generate_content_async(
            first_message,
            generation_config=genai.types.GenerationConfig(
                temperature=0.5,
                max_output_tokens=20,
            ),
        )
        title = response.text.strip().strip('"')
        return title[:100]
    except Exception:
        return first_message[:50] + ("..." if len(first_message) > 50 else "")


# ─────────────────────────────────────────────
# Citations
# ─────────────────────────────────────────────


def extract_citations_from_response(response_text: str, chunks: List[dict]) -> List[dict]:
    """
    Parse citation anchors [^doc_id:page] from response and map them
    to chunk metadata. Checks both document ID and page number.
    """
    citations = []
    seen = set()

    pattern = r'\[\^(\d+):(\d+|N/A)\]'
    matches = re.findall(pattern, response_text)

    for doc_id_str, page_str in matches:
        try:
            doc_id = int(doc_id_str)
        except ValueError:
            continue

        key = (doc_id, page_str)
        if key in seen:
            continue
        seen.add(key)

        found_chunk = None
        for chunk in chunks:
            if chunk["document_id"] == doc_id:
                # Keep first match as fallback
                if not found_chunk:
                    found_chunk = chunk
                
                # Try to find exact page match
                page_num = chunk.get("page_number")
                page_match = (page_str == "N/A" and page_num is None) or (page_num is not None and str(page_num) == page_str)
                if page_match:
                    found_chunk = chunk
                    break

        if found_chunk:
            citations.append({
                "chunk_id": found_chunk["chunk_id"],
                "document_id": doc_id,
                "document_title": found_chunk["document_title"],
                "page_number": found_chunk.get("page_number"),
                "quote": found_chunk["content"][:200],
            })

    return citations
