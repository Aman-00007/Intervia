# src/intervia/domains/invitations/service.py
import random
import string
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from .models import Invitation, InvitationStatus
from .repository import InvitationRepository
from .schemas import InvitationCreate

class InvitationService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = InvitationRepository(session)

    def _generate_code(self, prefix: str = "C") -> str:
        # Generates codes like "C-7K2" to match your Figma designs
        chars = string.ascii_uppercase + string.digits
        short_id = "".join(random.choices(chars, k=3))
        return f"{prefix}-{short_id}"

    async def create_invitation(self, data: InvitationCreate, interviewer_id: UUID) -> Invitation:
        # Ensure unique code
        code = self._generate_code()
        existing = await self.repo.get_by_code(code)
        while existing:
            code = self._generate_code()

        new_invite = Invitation(
            code=code,
            interviewer_id=interviewer_id,
            role_title=data.role_title,
            duration_minutes=data.duration_minutes,
            scheduled_at=data.scheduled_at,
            status=InvitationStatus.DELIVERED # Assuming email is sent immediately in background
        )
        return await self.repo.create(new_invite)

    async def validate_code(self, code: str) -> Invitation:
        invite = await self.repo.get_by_code(code)
        if not invite:
            raise HTTPException(status_code=404, detail="Invalid interview code.")
        
        if invite.status == InvitationStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="This interview has been cancelled.")
            
        if invite.status == InvitationStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="This interview is already completed.")

        return invite

    async def accept_invitation(self, code: str) -> Invitation:
        invite = await self.validate_code(code)
        if invite.status != InvitationStatus.ACCEPTED:
            return await self.repo.update_status(invite, InvitationStatus.ACCEPTED)
        return invite