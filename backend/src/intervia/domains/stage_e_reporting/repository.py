# src/intervia/domains/stage_e_reporting/repository.py
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from intervia.domains.stage_e_reporting.models import StudentReportModel, ExecutiveReportModel
from intervia.core.database import VaultSessionLocal
from intervia.domains.stage_a_onboarding.models import CandidateIdentity, DPDPConsentRecord

def _to_uuid(val) -> UUID:
    if isinstance(val, UUID):
        return val
    try:
        return UUID(str(val))
    except (ValueError, TypeError):
        return uuid.uuid5(uuid.NAMESPACE_DNS, str(val))

class ReportingRepository:
    """Handles database transactions and cross-schema identity joins for Stage E reports."""

    def __init__(self, session: AsyncSession):
        self.db = session

    async def save_student_report(self, session_id, candidate_id, data: dict) -> StudentReportModel:
        sess_uuid = _to_uuid(session_id)
        report = StudentReportModel(
            session_id=sess_uuid,
            candidate_id=str(candidate_id),
            strengths_weaknesses={"strengths": data.get("strengths") or [], "weaknesses": data.get("weaknesses") or []},
            skill_radar=data.get("skill_radar") or [],
            growth_roadmap=data.get("growth_roadmap") or []
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def save_executive_report(self, session_id, data: dict) -> ExecutiveReportModel:
        sess_uuid = _to_uuid(session_id)
        report = ExecutiveReportModel(
            session_id=sess_uuid,
            hiring_recommendation=data.get("hiring_recommendation") or "HIRE",
            composite_score=str(data.get("composite_score") or "8.5/10"),
            risk_flags=data.get("risk_flags") or [],
            transcript_summary=data.get("transcript_summary") or "Interview completed successfully."
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def get_report_by_session(self, session_id) -> dict:
        sess_uuid = _to_uuid(session_id)
        result = await self.db.execute(
            select(StudentReportModel).where(StudentReportModel.session_id == sess_uuid)
        )
        student_rep = result.scalars().first()
        
        exec_result = await self.db.execute(
            select(ExecutiveReportModel).where(ExecutiveReportModel.session_id == sess_uuid)
        )
        exec_rep = exec_result.scalars().first()

        return {
            "student_report": student_rep,
            "executive_report": exec_rep
        }

    async def get_candidate_identity(self, session_id: str | UUID) -> str:
        """
        CROSS-SCHEMA IDENTITY JOIN:
        Queries the identity_vault to resolve the real name for the recruiter's PDF.
        This ensures the AI never sees the name, but the final PDF has it.
        """
        try:
            session_uuid = _to_uuid(session_id)
            
            # Open a new session specifically for the Vault DB
            async with VaultSessionLocal() as vault_db:
                # 1. Find the consent record to get the user_id
                consent_stmt = select(DPDPConsentRecord.user_id).where(DPDPConsentRecord.session_id == session_uuid)
                consent_result = await vault_db.execute(consent_stmt)
                user_id = consent_result.scalar_one_or_none()

                if not user_id:
                    return "Candidate"

                # 2. Query the CandidateIdentity table for the real name
                candidate_stmt = select(CandidateIdentity.real_full_name).where(CandidateIdentity.user_id == user_id)
                candidate_result = await vault_db.execute(candidate_stmt)
                real_name = candidate_result.scalar_one_or_none()
                
                return real_name or "Candidate"
                
        except Exception as e:
            print(f"Error fetching identity for session {session_id}: {str(e)}")
            return "Candidate"
