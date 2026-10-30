# src/intervia/domains/dashboard/schemas.py
from pydantic import BaseModel
from typing import List
from intervia.domains.invitations.schemas import InvitationResponse

class InvitationMetrics(BaseModel):
    upcoming_sessions: int
    invitations_delivered: int
    awaiting_response: int

class InterviewerDashboardResponse(BaseModel):
    metrics: InvitationMetrics
    upcoming_interviews: List[InvitationResponse]
    previous_interviews: List[InvitationResponse]

class CandidateDashboardResponse(BaseModel):
    next_interview: InvitationResponse | None
    past_interviews: List[InvitationResponse]