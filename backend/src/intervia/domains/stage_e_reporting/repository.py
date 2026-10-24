from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from intervia.domains.stage_e_reporting.models import StudentReportModel, ExecutiveReportModel

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