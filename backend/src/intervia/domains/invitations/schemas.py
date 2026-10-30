# src/intervia/domains/invitations/schemas.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime
from .models import InvitationStatus

class InvitationCreate(BaseModel):
    role_title: str = Field(..., min_length=2, max_length=255)
    duration_minutes: int = Field(default=45, ge=15, le=180)
    scheduled_at: datetime
    # Note: In a full flow, you'd also pass the candidate's email here to send the invite

class InvitationResponse(BaseModel):
    id: UUID
    code: str
    interviewer_id: UUID
    role_title: str
    duration_minutes: int
    scheduled_at: datetime
    status: InvitationStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InvitationValidateResponse(BaseModel):
    valid: bool
    role_title: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    message: str