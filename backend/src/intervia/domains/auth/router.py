# src/intervia/domains/auth/router.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
import jwt
from jwt.exceptions import InvalidTokenError

from intervia.core.database import get_vault_db
from intervia.core.config import settings
from .schemas import (
    UserRegisterRecruiter, 
    UserRegisterCandidate, 
    UserLogin, 
    TokenWithUser, 
    UserResponse
)
from .service import AuthService
from .repository import UserRepository

router = APIRouter(tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")

# Dependency to get current user from JWT
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_vault_db)
) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    repo = UserRepository(session)
    user = await repo.get_by_id(UUID(user_id))
    if user is None:
        raise credentials_exception
    return UserResponse.model_validate(user)


@router.post("/register/recruiter", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_recruiter(
    data: UserRegisterRecruiter,
    session: AsyncSession = Depends(get_vault_db)
):
    """Register a new recruiter/admin account."""
    service = AuthService(session)
    user = await service.register_recruiter(data)
    return UserResponse.model_validate(user)


@router.post("/register/candidate", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_candidate(
    data: UserRegisterCandidate,
    session: AsyncSession = Depends(get_vault_db)
):
    """Register a new candidate account."""
    service = AuthService(session)
    user = await service.register_candidate(data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenWithUser)
async def login(
    data: UserLogin,
    session: AsyncSession = Depends(get_vault_db)
):
    """Authenticate a user and return a JWT token."""
    service = AuthService(session)
    user, token = await service.authenticate(data)
    return TokenWithUser(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: UserResponse = Depends(get_current_user)
):
    """Get the currently logged-in user's profile."""
    return current_user