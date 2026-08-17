"""
Document ORM model.
"""

import enum
from datetime import datetime

from sqlalchemy import String, Enum, DateTime, ForeignKey, Integer, func, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AccessLevel(str, enum.Enum):
    student = "student"
    faculty = "faculty"
    admin = "admin"
    support = "support"
    public = "public"


class DocumentStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    processed = "processed"
    failed = "failed"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    access_level: Mapped[AccessLevel] = mapped_column(
        Enum(AccessLevel, name="access_level", create_type=True),
        nullable=False,
        default=AccessLevel.public,
    )
    department: Mapped[str] = mapped_column(String(255), nullable=True)
    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status", create_type=True),
        nullable=False,
        default=DocumentStatus.pending,
    )
    file_content: Mapped[bytes] = mapped_column(LargeBinary, nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    uploader = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Document id={self.id} title={self.title} status={self.status}>"
