import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

# Fixed: Using get_vault_db to match your database.py!
from intervia.core.database import get_vault_db
from intervia.domains.stage_a_onboarding.schemas import OnboardingRequest, OnboardingResponse
from intervia.domains.stage_a_onboarding.repository import OnboardingRepository
from intervia.domains.stage_a_onboarding.service import OnboardingService
from intervia.core.security.jwt_rbac import RequireRole, UserRole

# Clean router (main.py attaches the "/v1/onboarding" prefix and tags automatically)
router = APIRouter()

@router.post("/consent", response_model=OnboardingResponse)
async def submit_consent(
    request: OnboardingRequest,
    db_session: AsyncSession = Depends(get_vault_db),
    current_user: dict = Depends(RequireRole([UserRole.STUDENT]))
):
    """Saves the user's real identity and DPDP legal consent into the Vault Database."""
    repo = OnboardingRepository(db_session)
    
    session_id = uuid.uuid4()
    user_id = current_user["user_id"]
    
    try:
        await repo.create_candidate_identity(request)
        await repo.record_dpdp_consent(user_id, session_id, request)
        await db_session.commit()
        
        return OnboardingResponse(
            user_id=user_id,
            session_id=session_id,
            message="Identity secured in vault. DPDP consent recorded."
        )
    except Exception as e:
        await db_session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to secure identity: {str(e)}")

@router.post("/prepare")
async def prepare_interview(
    file: UploadFile = File(...),
    github_username: str | None = Form(None),
    current_user: dict = Depends(RequireRole([UserRole.STUDENT]))
):
    """Uploads the resume, scrubs PII, and generates the AI questions."""
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are allowed.")
    
    try:
        pdf_bytes = await file.read()
        result = await OnboardingService.process_and_prepare(pdf_bytes, github_username)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preparation failed: {str(e)}")