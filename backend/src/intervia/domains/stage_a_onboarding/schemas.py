import uuid
from typing import Dict, List
from pydantic import BaseModel, EmailStr, Field

class DPDPurposeConsent(BaseModel):
    camera_audio: bool = Field(..., description="Consent for video/audio recording")
    ai_processing: bool = Field(..., description="Consent for AI processing of resume and code")
    data_retention: bool = Field(..., description="Consent to retain data for 30 days")

class OnboardingRequest(BaseModel):
    """Data sent from frontend when candidate registers."""
    real_full_name: str = Field(..., max_length=255)
    real_email: EmailStr
    real_phone: str | None = None
    college_id: str | None = None
    github_username: str | None = None
    
    # DPDP Consent fields
    is_above_18_verified: bool = Field(..., description="User confirmed they are 18+")
    purposes_accepted: DPDPurposeConsent

class RedactionPreview(BaseModel):
    """Returns the scrubbed resume back to the frontend for candidate approval."""
    original_text_length: int
    scrubbed_resume_text: str
    entities_redacted: List[str] = Field(default_factory=list)

class OnboardingResponse(BaseModel):
    """The final response sent after successful vault storage."""
    user_id: uuid.UUID
    session_id: uuid.UUID
    message: str = "Identity secured in vault. Proceeding to Track B."