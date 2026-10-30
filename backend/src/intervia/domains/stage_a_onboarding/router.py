# src/intervia/domains/stage_a_onboarding/router.py
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

# Database dependencies
from intervia.core.database import get_vault_db, get_ops_db

# Schemas & Services
from intervia.domains.stage_a_onboarding.schemas import (
    OnboardingRequest, 
    OnboardingResponse, 
    OfflinePrepareResponse
)
from intervia.domains.stage_a_onboarding.repository import OnboardingRepository
from intervia.domains.stage_a_onboarding.service import OnboardingService

# Auth & RBAC
from intervia.core.security.jwt_rbac import RequireRole, UserRole

router = APIRouter()

# --- Inline Schema for the offline preparation request ---
class OfflinePrepareRequest(BaseModel):
    session_id: uuid.UUID
    cleaned_resume_text: str

# ==========================================
# 1. Consent & Identity
# ==========================================
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
        await repo.create_candidate_identity(user_id, request)
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


# ==========================================
# 2. Resume & AI Preparation
# ==========================================
@router.post("/prepare")
async def prepare_interview(
    session_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    github_username: str | None = Form(None),
    db_session: AsyncSession = Depends(get_vault_db),
    current_user: dict = Depends(RequireRole([UserRole.STUDENT]))
):
    """Uploads the resume, scrubs PII, encrypts the mapping, and generates the AI questions."""
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF resumes are allowed.")
    
    try:
        pdf_bytes = await file.read()
        repo = OnboardingRepository(db_session)
        
        result = await OnboardingService.process_and_prepare(
            repo=repo,
            user_id=current_user["user_id"],
            session_id=session_id,
            pdf_bytes=pdf_bytes,
            github_username=github_username
        )
        return result
        
    except Exception as e:
        await db_session.rollback()
        raise HTTPException(status_code=500, detail=f"Preparation failed: {str(e)}")


# ==========================================
# 3. Device + Offline Preparation
# ==========================================
@router.post("/offline-prepare", response_model=OfflinePrepareResponse)
async def prepare_offline_buffer(
    request: OfflinePrepareRequest,
    db_session: AsyncSession = Depends(get_ops_db), # Using Ops DB because SessionSeed is infrastructure
    current_user: dict = Depends(RequireRole([UserRole.STUDENT]))
):
    """
    Generates the Server Seed and 2 Encrypted Hints for the Offline Black Box.
    (Features Document: "pre-loads 2 encrypted hints; receives server seed")
    """
    repo = OnboardingRepository(db_session)
    
    try:
        result = await OnboardingService.prepare_offline_mode(
            repo=repo,
            session_id=request.session_id,
            cleaned_resume_text=request.cleaned_resume_text
        )
        
        return OfflinePrepareResponse(
            server_seed=result["server_seed"],
            encrypted_hints=result["encrypted_hints"]
        )
    except Exception as e:
        await db_session.rollback()
        raise HTTPException(status_code=500, detail=f"Offline preparation failed: {str(e)}")