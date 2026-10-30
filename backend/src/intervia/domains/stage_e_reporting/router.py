# src/intervia/domains/stage_e_reporting/router.py
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
import os

from intervia.core.database import get_ops_db
from intervia.core.security.jwt_rbac import RequireRole, UserRole
from intervia.domains.stage_e_reporting.service import ReportingService
from intervia.domains.stage_e_reporting.repository import ReportingRepository
from intervia.domains.stage_e_reporting.schemas import StudentReportResponse, ExecutiveReportResponse

router = APIRouter(tags=["Stage E: Reporting"])

def get_reporting_repo(db_session: AsyncSession = Depends(get_ops_db)) -> ReportingRepository:
    return ReportingRepository(db_session)

def get_reporting_service(repo: ReportingRepository = Depends(get_reporting_repo)) -> ReportingService:
    return ReportingService(repo)

# --- Trigger Generation (Called after interview ends) ---
@router.post("/{session_id}/generate")
async def trigger_report_generation(
    session_id: str, 
    candidate_id: str, 
    background_tasks: BackgroundTasks,
    service: ReportingService = Depends(get_reporting_service),
    current_user: dict = Depends(RequireRole([UserRole.INTERVIEWER])) # Only Interviewer can trigger
):
    mock_ai_data = {
        "composite_score": "8.5/10",
        "hiring_recommendation": "HIRE",
        "transcript_summary": "The candidate demonstrated strong problem-solving skills.",
        "risk_flags": ["None"],
        "strengths": ["Optimization", "Communication"],
        "weaknesses": ["Edge cases"],
        "skill_radar": [],
        "growth_roadmap": []
    }
    
    background_tasks.add_task(
        service.generate_and_export_report, 
        session_id, 
        candidate_id, 
        mock_ai_data
    )
    
    return {"message": "Report generation started", "session_id": session_id}

# --- Fetch Student Report (Figma: "Loopholes & Prosperity" screen) ---
@router.get("/{session_id}/student", response_model=StudentReportResponse)
async def get_student_report(
    session_id: str,
    repo: ReportingRepository = Depends(get_reporting_repo),
    current_user: dict = Depends(RequireRole([UserRole.STUDENT])) # Only Student can access
):
    reports = await repo.get_report_by_session(session_id)
    student_rep = reports["student_report"]
    
    if not student_rep:
        raise HTTPException(status_code=404, detail="Student report not found.")
        
    return StudentReportResponse(
        session_id=str(student_rep.session_id),
        strengths=student_rep.strengths_weaknesses.get("strengths", []),
        weaknesses=student_rep.strengths_weaknesses.get("weaknesses", []),
        skill_radar=student_rep.skill_radar,
        growth_roadmap=student_rep.growth_roadmap
    )

# --- Fetch Executive Report (Figma: "Evidence over impressions" screen) ---
@router.get("/{session_id}/executive", response_model=ExecutiveReportResponse)
async def get_executive_report(
    session_id: str,
    repo: ReportingRepository = Depends(get_reporting_repo),
    current_user: dict = Depends(RequireRole([UserRole.INTERVIEWER])) # Only Interviewer can access
):
    reports = await repo.get_report_by_session(session_id)
    exec_rep = reports["executive_report"]
    
    if not exec_rep:
        raise HTTPException(status_code=404, detail="Executive report not found.")
        
    return ExecutiveReportResponse(
        session_id=str(exec_rep.session_id),
        hiring_recommendation=exec_rep.hiring_recommendation,
        composite_score=exec_rep.composite_score,
        risk_flags=exec_rep.risk_flags,
        transcript_summary=exec_rep.transcript_summary
    )

# --- Download PDF Button ---
@router.get("/{session_id}/download-pdf")
async def download_pdf(
    session_id: str,
    current_user: dict = Depends(RequireRole([UserRole.STUDENT, UserRole.INTERVIEWER])) # Both can download their respective PDFs
):
    pdf_path = f"/tmp/report_{session_id}.pdf"
    
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not generated yet. Please wait.")
        
    return FileResponse(
        pdf_path, 
        media_type="application/pdf", 
        filename=f"Intervia_Report_{session_id}.pdf"
    )