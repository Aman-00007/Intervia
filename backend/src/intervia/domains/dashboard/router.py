# src/intervia/domains/dashboard/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from intervia.core.database import get_ops_db
from intervia.domains.auth.router import get_current_user
from intervia.domains.auth.schemas import UserResponse
from intervia.domains.auth.models import UserRole
from intervia.domains.invitations.schemas import InvitationResponse
from .schemas import InterviewerDashboardResponse, CandidateDashboardResponse
from .service import DashboardService

router = APIRouter(tags=["Dashboard"])

# Dependency for Interviewer-only routes
async def get_current_interviewer(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    if current_user.role not in [UserRole.INTERVIEWER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only interviewers can access this dashboard."
        )
    return current_user


@router.get("/interviewer", response_model=InterviewerDashboardResponse)
async def get_interviewer_dashboard(
    current_user: UserResponse = Depends(get_current_interviewer),
    session: AsyncSession = Depends(get_ops_db)
):
    """
    Get all data needed for the Recruiter Dashboard screen.
    """
    service = DashboardService(session)
    
    metrics = await service.get_interviewer_metrics(current_user.id)
    upcoming = await service.get_interviewer_upcoming(current_user.id)
    previous = await service.get_interviewer_previous(current_user.id)

    return InterviewerDashboardResponse(
        metrics=metrics,
        upcoming_interviews=[InvitationResponse.model_validate(i) for i in upcoming],
        previous_interviews=[InvitationResponse.model_validate(i) for i in previous]
    )


@router.get("/candidate", response_model=CandidateDashboardResponse)
async def get_candidate_dashboard(
    current_user: UserResponse = Depends(get_current_user),
    session: AsyncSession = Depends(get_ops_db)
):
    """
    Get all data needed for the Candidate Dashboard screen.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only candidates can access this dashboard.")

    service = DashboardService(session)
    
    # In a real implementation, you'd fetch the invitation mapped to this candidate's email
    next_interview = await service.get_candidate_next_interview(current_user.email)

    return CandidateDashboardResponse(
        next_interview=InvitationResponse.model_validate(next_interview) if next_interview else None,
        past_interviews=[] # Implement past interviews fetching similarly
    )