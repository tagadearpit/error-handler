"""
Document text extraction and chunking service.
Supports PDF (PyMuPDF), DOCX, TXT, and Markdown files.
"""

import logging
import os
from typing import List, Tuple

import fitz  # PyMuPDF
from docx import Document as DocxDocument

logger = logging.getLogger(__name__)


def count_tokens(text: str) -> int:
    """Approximate token count using word splitting (~1.3 tokens per word)."""
    return int(len(text.split()) * 1.3)


# ─────────────────────────────────────────────
# Text Extraction
# ─────────────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> List[Tuple[int, str]]:
    """
    Extract text from PDF preserving page numbers.
    Returns: List of (page_number, page_text) tuples.
    """
    pages: List[Tuple[int, str]] = []
    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            if text.strip():
                pages.append((page_num + 1, text.strip()))
        doc.close()
    except Exception as e:
        logger.error(f"PDF extraction failed for {file_path}: {e}")
        raise
    return pages


def extract_text_from_docx(file_path: str) -> List[Tuple[int, str]]:
    """Extract text from DOCX file. Returns as single page."""
    try:
        doc = DocxDocument(file_path)
        full_text = "\n".join(para.text for para in doc.paragraphs if para.text.strip())
        return [(1, full_text)] if full_text else []
    except Exception as e:
        logger.error(f"DOCX extraction failed for {file_path}: {e}")
        raise


def extract_text_from_txt(file_path: str) -> List[Tuple[int, str]]:
    """Extract text from TXT/Markdown files."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return [(1, content)] if content.strip() else []
    except Exception as e:
        logger.error(f"TXT extraction failed for {file_path}: {e}")
        raise


def extract_text(file_path: str, mime_type: str) -> List[Tuple[int, str]]:
    """Route extraction based on MIME type."""
    extractors = {
        "application/pdf": extract_text_from_pdf,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": extract_text_from_docx,
        "text/plain": extract_text_from_txt,
        "text/markdown": extract_text_from_txt,
    }

    extractor = extractors.get(mime_type)
    if not extractor:
        raise ValueError(f"Unsupported MIME type: {mime_type}")

    return extractor(file_path)


# ─────────────────────────────────────────────
# Recursive Character Chunking
# ─────────────────────────────────────────────

def recursive_chunk_text(
    text: str,
    chunk_size: int = 500,
    chunk_overlap: int = 50,
    separators: List[str] = None,
) -> List[str]:
    """
    Split text into chunks of approximately `chunk_size` tokens
    with `chunk_overlap` token overlap between consecutive chunks.
    Uses recursive character splitting with hierarchical separators.
    """
    if separators is None:
        separators = ["\n\n", "\n", ". ", " ", ""]

    chunks: List[str] = []

    # If text fits in one chunk, return it directly
    if count_tokens(text) <= chunk_size:
        if text.strip():
            chunks.append(text.strip())
        return chunks

    # Find the best separator
    separator = separators[-1]
    for sep in separators:
        if sep in text:
            separator = sep
            break

    # Split by separator
    splits = text.split(separator) if separator else list(text)
    splits = [s for s in splits if s.strip()]

    current_chunk: List[str] = []
    current_tokens = 0

    for split in splits:
        split_tokens = count_tokens(split)

        if current_tokens + split_tokens > chunk_size and current_chunk:
            # Save current chunk
            chunk_text = separator.join(current_chunk).strip()
            if chunk_text:
                chunks.append(chunk_text)

            # Calculate overlap — keep trailing pieces
            overlap_tokens = 0
            overlap_pieces: List[str] = []
            for piece in reversed(current_chunk):
                piece_tokens = count_tokens(piece)
                if overlap_tokens + piece_tokens > chunk_overlap:
                    break
                overlap_pieces.insert(0, piece)
                overlap_tokens += piece_tokens

            current_chunk = overlap_pieces
            current_tokens = overlap_tokens

        current_chunk.append(split)
        current_tokens += split_tokens

    # Don't forget the last chunk
    if current_chunk:
        chunk_text = separator.join(current_chunk).strip()
        if chunk_text:
            chunks.append(chunk_text)

    return chunks


def chunk_document(
    pages: List[Tuple[int, str]],
    chunk_size: int = 500,
    chunk_overlap: int = 50,
) -> List[dict]:
    """
    Chunk a document's pages into overlapping chunks with metadata.
    Returns list of dicts with: content, page_number, chunk_index.
    """
    all_chunks: List[dict] = []
    chunk_index = 0

    for page_number, page_text in pages:
        page_chunks = recursive_chunk_text(page_text, chunk_size, chunk_overlap)

        for chunk_text in page_chunks:
            all_chunks.append({
                "content": chunk_text,
                "page_number": page_number,
                "chunk_index": chunk_index,
                "metadata": {
                    "page_number": page_number,
                    "token_count": count_tokens(chunk_text),
                },
            })
            chunk_index += 1

    logger.info(f"Document chunked into {len(all_chunks)} chunks")
    return all_chunks
