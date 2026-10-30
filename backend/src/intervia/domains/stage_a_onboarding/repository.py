# src/intervia/domains/stage_a_onboarding/repository.py
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from intervia.domains.stage_a_onboarding.models import (
    CandidateIdentity, 
    DPDPConsentRecord, 
    PIITokenVault,
    SessionSeed
)
from intervia.domains.stage_a_onboarding.schemas import OnboardingRequest

class OnboardingRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_candidate_identity(self, user_id: uuid.UUID, data: OnboardingRequest) -> CandidateIdentity:
        """Saves the real identity into Physical Table 1."""
        candidate = CandidateIdentity(
            user_id=user_id,  # <-- Make sure this is here!
            real_full_name=data.real_full_name,
            real_email=data.real_email,
            real_phone=data.real_phone,
            college_id=data.college_id,
            github_username=data.github_username
        )
        self.session.add(candidate)
        await self.session.flush() # Flushes to get the auto-generated user_id
        return candidate
    async def record_dpdp_consent(self, user_id: uuid.UUID, session_id: uuid.UUID, data: OnboardingRequest) -> DPDPConsentRecord:
        """Saves the legal consent into Physical Table 2."""
        consent_record = DPDPConsentRecord(
            user_id=user_id,
            session_id=session_id,
            is_above_18_verified=data.is_above_18_verified,
            purposes_accepted=data.purposes_accepted.model_dump()
        )
        self.session.add(consent_record)
        return consent_record

    async def store_pii_map(self, user_id: uuid.UUID, session_id: uuid.UUID, encrypted_map: bytes) -> PIITokenVault:
        """Saves the AES-encrypted translation map into Physical Table 3."""
        vault_entry = PIITokenVault(
            user_id=user_id,
            session_id=session_id,
            aes_encrypted_map=encrypted_map
        )
        self.session.add(vault_entry)
        return vault_entry

    async def save_session_seed(self, session_id: uuid.UUID, seed: str) -> dict:
        """Saves the offline server seed for Stage D verification."""
        stmt = insert(SessionSeed).values(session_id=session_id, server_seed=seed)
        stmt = stmt.on_conflict_do_update(
            index_elements=['session_id'],
            set_={'server_seed': seed}
        )
        await self.session.execute(stmt)
        await self.session.commit()
        return {"session_id": session_id, "server_seed": seed}