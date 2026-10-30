# src/intervia/domains/auth/schemas.py
from pydantic import BaseModel, EmailStr, Field, ConfigDict, model_validator
from typing import Optional, Any
from uuid import UUID
from datetime import datetime
from .models import UserRole

class UserRegisterRecruiter(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    organization_name: Optional[str] = "Engineering Team"
    company_name: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    terms_accepted: Optional[bool] = True

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "company_name" in data and ("organization_name" not in data or not data.get("organization_name")):
                data["organization_name"] = data["company_name"]
            if "terms_accepted" not in data or data.get("terms_accepted") is None:
                data["terms_accepted"] = True
            if "organization_name" not in data or not data.get("organization_name"):
                data["organization_name"] = "Engineering Team"
        return data

class UserRegisterCandidate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password (at least 6 characters)")
    terms_accepted: Optional[bool] = True

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "terms_accepted" not in data or data.get("terms_accepted") is None:
                data["terms_accepted"] = True
        return data

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
