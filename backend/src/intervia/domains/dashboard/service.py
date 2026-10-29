# src/intervia/domains/dashboard/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from uuid import UUID

from intervia.domains.invitations.models import Invitation, InvitationStatus
from intervia.domains.dashboard.schemas import InvitationMetrics

class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_interviewer_metrics(self, interviewer_id: UUID) -> InvitationMetrics:
        now = datetime.now(timezone.utc)

        # 1. Upcoming sessions (scheduled for the future, not cancelled/completed)
        stmt_upcoming = select(func.count(Invitation.id)).where(
            Invitation.interviewer_id == interviewer_id,
            Invitation.scheduled_at >= now,
            Invitation.status.notin_([InvitationStatus.CANCELLED, InvitationStatus.COMPLETED])
        )
        upcoming = (await self.session.execute(stmt_upcoming)).scalar() or 0

        # 2. Invitations delivered (total sent)
        stmt_delivered = select(func.count(Invitation.id)).where(
            Invitation.interviewer_id == interviewer_id,
            Invitation.status.in_([InvitationStatus.DELIVERED, InvitationStatus.ACCEPTED])
        )
        delivered = (await self.session.execute(stmt_delivered)).scalar() or 0

        # 3. Awaiting response (delivered but not yet accepted)
        stmt_awaiting = select(func.count(Invitation.id)).where(
            Invitation.interviewer_id == interviewer_id,
            Invitation.status == InvitationStatus.DELIVERED
        )
        awaiting = (await self.session.execute(stmt_awaiting)).scalar() or 0

        return InvitationMetrics(
            upcoming_sessions=upcoming,
            invitations_delivered=delivered,
            awaiting_response=awaiting
        )

    async def get_interviewer_upcoming(self, interviewer_id: UUID) -> list[Invitation]:
        now = datetime.now(timezone.utc)
        stmt = select(Invitation).where(
            Invitation.interviewer_id == interviewer_id,
            Invitation.scheduled_at >= now,
            Invitation.status.notin_([InvitationStatus.CANCELLED, InvitationStatus.COMPLETED])
        ).order_by(Invitation.scheduled_at.asc())
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_interviewer_previous(self, interviewer_id: UUID) -> list[Invitation]:
        # Previous = either completed, or scheduled in the past
        now = datetime.now(timezone.utc)
        stmt = select(Invitation).where(
            Invitation.interviewer_id == interviewer_id,
            (Invitation.scheduled_at < now) | (Invitation.status == InvitationStatus.COMPLETED)
        ).order_by(Invitation.scheduled_at.desc())
        
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_candidate_next_interview(self, candidate_email: str) -> Invitation | None:
        # In a full flow, you would link the candidate's email to the invitation.
        # For now, we will just fetch the most recent accepted invitation.
        stmt = select(Invitation).where(
            Invitation.status == InvitationStatus.ACCEPTED
        ).order_by(Invitation.scheduled_at.asc()).limit(1)
        
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()