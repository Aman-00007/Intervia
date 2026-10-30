# src/intervia/domains/stage_a_onboarding/schemas.py
import uuid
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

class DPDPurposeConsent(BaseModel):
    camera_audio: bool = Field(..., description="Consent for video/audio recording")
    ai_processing: bool = Field(..., description="Consent for AI processing of resume and code")
    data_retention: bool = Field(..., description="Consent to retain data for 30 days")

class OnboardingRequest(BaseModel):
    """Data sent from frontend when candidate registers."""
    real_full_name: str = Field(..., max_length=255)
    real_email: EmailStr
    real_phone: Optional[str] = None
    college_id: Optional[str] = None
    github_username: Optional[str] = None
    
    # DPDP Consent fields
    is_above_18_verified: bool = Field(..., description="User confirmed they are 18+")
    purposes_accepted: DPDPurposeConsent

class OnboardingResponse(BaseModel):
    """The final response sent after successful vault storage."""
    user_id: uuid.UUID
    session_id: uuid.UUID
    message: str = "Identity secured in vault. Proceeding to Track B."

class GeneratedQuestionsResponse(BaseModel):
    """Schema for AI-generated interview questions."""
    questions: List[str]

class GeneratedHintsResponse(BaseModel):
    """Schema for AI-generated offline hints."""
    hints: List[str]

class OfflinePrepareResponse(BaseModel):
    """Response for the offline preparation endpoint."""
    server_seed: str
    encrypted_hints: List[str]
    message: str = "Offline buffer prepared successfully."