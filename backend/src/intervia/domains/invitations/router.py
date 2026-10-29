# src/intervia/domains/invitations/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import List

from intervia.core.database import get_ops_db
from intervia.domains.auth.router import get_current_user
from intervia.domains.auth.schemas import UserResponse
from intervia.domains.auth.models import UserRole
from .schemas import InvitationCreate, InvitationResponse, InvitationValidateResponse
from .service import InvitationService

router = APIRouter(tags=["Invitations"])

# Dependency for Interviewer-only routes
async def get_current_interviewer(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    if current_user.role not in [UserRole.INTERVIEWER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only interviewers can perform this action."
        )
    return current_user


@router.post("/create", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def create_invitation(
    data: InvitationCreate,
    current_user: UserResponse = Depends(get_current_interviewer),
    session: AsyncSession = Depends(get_ops_db)
):
    """
    Create a new interview invitation. (Recruiter Dashboard)
    Generates a unique code like 'C-7K2'.
    """
    service = InvitationService(session)
    invitation = await service.create_invitation(data, current_user.id)
    return InvitationResponse.model_validate(invitation)


@router.get("/my-invitations", response_model=List[InvitationResponse])
async def get_my_invitations(
    current_user: UserResponse = Depends(get_current_interviewer),
    session: AsyncSession = Depends(get_ops_db)
):
    """
    List all invitations created by the logged-in interviewer. (Recruiter Dashboard list)
    """
    service = InvitationService(session)
    repo = service.repo
    invitations = await repo.get_by_interviewer(current_user.id)
    return [InvitationResponse.model_validate(i) for i in invitations]


@router.post("/verify-code", response_model=InvitationValidateResponse)
async def verify_interview_code(
    code: str,
    session: AsyncSession = Depends(get_ops_db)
):
    """
    Verify an invitation code before a candidate joins. (Candidate Login flow)
    Does not require authentication (the code itself is the auth).
    """
    service = InvitationService(session)
    try:
        invitation = await service.validate_code(code)
        return InvitationValidateResponse(
            valid=True,
            role_title=invitation.role_title,
            scheduled_at=invitation.scheduled_at,
            message="Code verified successfully."
        )
    except HTTPException as e:
        return InvitationValidateResponse(valid=False, message=e.detail)


@router.post("/accept/{code}", response_model=InvitationResponse)
async def accept_invitation(
    code: str,
    session: AsyncSession = Depends(get_ops_db)
):
    """
    Mark an invitation as accepted. (Candidate Lobby flow)
    """
    service = InvitationService(session)
    invitation = await service.accept_invitation(code)
    return InvitationResponse.model_validate(invitation)