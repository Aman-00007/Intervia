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
        """Saves the real identity, or updates it if it already exists."""
        # 1. Check if the candidate already exists
        existing_candidate = await self.session.get(CandidateIdentity, user_id)
        
        if existing_candidate:
            # Update the existing record
            existing_candidate.real_full_name = data.real_full_name
            existing_candidate.real_email = data.real_email
            existing_candidate.real_phone = data.real_phone
            existing_candidate.college_id = data.college_id
            existing_candidate.github_username = data.github_username
            await self.session.flush()
            return existing_candidate
            
        # 2. If they don't exist, create a new one
        candidate = CandidateIdentity(
            user_id=user_id,
            real_full_name=data.real_full_name,
            real_email=data.real_email,
            real_phone=data.real_phone,
            college_id=data.college_id,
            github_username=data.github_username
        )
        self.session.add(candidate)
        await self.session.flush()
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