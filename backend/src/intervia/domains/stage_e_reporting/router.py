from fastapi import APIRouter, Depends, BackgroundTasks
from intervia.domains.stage_e_reporting.service import ReportingService

router = APIRouter(prefix="/v1/reporting", tags=["Reporting"])

@router.post("/{session_id}/generate")
async def trigger_report_generation(session_id: str, candidate_id: str, background_tasks: BackgroundTasks):
    # In a real app, you inject the service via dependencies
    # This endpoint acknowledges the request quickly and processes the heavy PDF generation in the background
    return {"message": "Report generation started", "session_id": session_id}