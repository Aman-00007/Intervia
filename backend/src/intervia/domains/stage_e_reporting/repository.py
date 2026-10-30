# src/intervia/domains/stage_e_reporting/repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from intervia.domains.stage_e_reporting.models import StudentReportModel, ExecutiveReportModel
from intervia.core.database import VaultSessionLocal
from intervia.domains.stage_a_onboarding.models import CandidateIdentity, DPDPConsentRecord

class ReportingRepository:
    """Handles database transactions and cross-schema identity joins for Stage E reports."""

    def __init__(self, session: AsyncSession):
        self.db = session

    async def save_student_report(self, session_id, candidate_id, data: dict) -> StudentReportModel:
        report = StudentReportModel(
            session_id=session_id,
            candidate_id=candidate_id,
            strengths_weaknesses={"strengths": data.get("strengths"), "weaknesses": data.get("weaknesses")},
            skill_radar=data.get("skill_radar"),
            growth_roadmap=data.get("growth_roadmap")
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def save_executive_report(self, session_id, data: dict) -> ExecutiveReportModel:
        report = ExecutiveReportModel(
            session_id=session_id,
            hiring_recommendation=data.get("hiring_recommendation"),
            composite_score=data.get("composite_score"),
            risk_flags=data.get("risk_flags"),
            transcript_summary=data.get("transcript_summary")
        )
        self.db.add(report)
        await self.db.commit()
        await self.db.refresh(report)
        return report

    async def get_report_by_session(self, session_id) -> dict:
        result = await self.db.execute(
            select(StudentReportModel).where(StudentReportModel.session_id == session_id)
        )
        student_rep = result.scalars().first()
        
        exec_result = await self.db.execute(
            select(ExecutiveReportModel).where(ExecutiveReportModel.session_id == session_id)
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
            # Convert to UUID if it's a string
            session_uuid = UUID(str(session_id)) if isinstance(session_id, str) else session_id
            
            # Open a new session specifically for the Vault DB
            async with VaultSessionLocal() as vault_db:
                # 1. Find the consent record to get the user_id
                consent_stmt = select(DPDPConsentRecord.user_id).where(DPDPConsentRecord.session_id == session_uuid)
                consent_result = await vault_db.execute(consent_stmt)
                user_id = consent_result.scalar_one_or_none()

                if not user_id:
                    return "Unknown Candidate (No Identity Record)"

                # 2. Query the CandidateIdentity table for the real name
                candidate_stmt = select(CandidateIdentity.real_full_name).where(CandidateIdentity.user_id == user_id)
                candidate_result = await vault_db.execute(candidate_stmt)
                real_name = candidate_result.scalar_one_or_none()
                
                return real_name or "Unknown Candidate"
                
        except Exception as e:
            print(f"Error fetching identity for session {session_id}: {str(e)}")
            return "Unknown Candidate"