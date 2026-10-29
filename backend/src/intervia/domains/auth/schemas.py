# src/intervia/domains/auth/schemas.py
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime
from .models import UserRole

class UserRegisterRecruiter(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    organization_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=12, description="Must be at least 12 characters, including a number and symbol.")
    terms_accepted: bool = Field(..., description="Must accept Terms of Service and Privacy Policy")

class UserRegisterCandidate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=12)
    terms_accepted: bool = Field(...)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    organization_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TokenWithUser(Token):
    user: UserResponse