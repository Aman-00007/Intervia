# src/intervia/domains/invitations/models.py
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
import enum

from intervia.core.database import OpsBase

class InvitationStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    DELIVERED = "DELIVERED"
    ACCEPTED = "ACCEPTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Invitation(OpsBase):
    """
    Operational data for scheduling and managing interviews.
    Contains NO PII (candidate email is handled securely or referenced via session).
    """
    __tablename__ = "invitations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    
    # Unique short code (e.g., "C-7K2" or "IV-2051")
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    
    # Recruiter / Interviewer who created this
    interviewer_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)
    
    # Basic role details
    role_title: Mapped[str] = mapped_column(String(255), nullable=False) # e.g., "Backend engineering"
    duration_minutes: Mapped[int] = mapped_column(Integer, default=45)
    
    # Scheduling
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # State management
    status: Mapped[InvitationStatus] = mapped_column(
        SQLEnum(InvitationStatus), 
        default=InvitationStatus.SCHEDULED, 
        nullable=False
    )
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)