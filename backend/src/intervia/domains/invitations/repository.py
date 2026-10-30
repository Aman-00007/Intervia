# src/intervia/domains/invitations/repository.py
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from .models import Invitation

class InvitationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_code(self, code: str) -> Invitation | None:
        stmt = select(Invitation).where(Invitation.code == code.upper())
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_interviewer(self, interviewer_id: UUID) -> list[Invitation]:
        stmt = select(Invitation).where(Invitation.interviewer_id == interviewer_id).order_by(Invitation.scheduled_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, invitation: Invitation) -> Invitation:
        self.session.add(invitation)
        await self.session.commit()
        await self.session.refresh(invitation)
        return invitation

    async def update_status(self, invitation: Invitation, status) -> Invitation:
        invitation.status = status
        await self.session.commit()
        await self.session.refresh(invitation)
        return invitation