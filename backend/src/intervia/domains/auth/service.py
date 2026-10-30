# src/intervia/domains/auth/service.py
from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
import bcrypt  # <-- Using native bcrypt instead of passlib
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from intervia.core.config import get_settings
from .models import User, UserRole
from .repository import UserRepository
from .schemas import UserRegisterRecruiter, UserRegisterCandidate, UserLogin

settings = get_settings()

class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = UserRepository(session)

    def _hash_password(self, password: str) -> str:
        # Native bcrypt hashing
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        # Native bcrypt verification
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except ValueError:
            return False

    def _create_access_token(self, subject: str, role: str) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {
            "exp": expire,
            "sub": str(subject),
            "role": role
        }
        return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    async def register_recruiter(self, data: UserRegisterRecruiter) -> User:
        if not data.terms_accepted:
            raise HTTPException(status_code=400, detail="Must accept terms and privacy policy.")
            
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered.")

        new_user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=self._hash_password(data.password),
            role=UserRole.INTERVIEWER, # Default for recruiter signup
            organization_name=data.organization_name,
            terms_accepted=data.terms_accepted
        )
        return await self.repo.create(new_user)

    async def register_candidate(self, data: UserRegisterCandidate) -> User:
        if not data.terms_accepted:
            raise HTTPException(status_code=400, detail="Must accept terms and privacy policy.")
            
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered.")

        new_user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=self._hash_password(data.password),
            role=UserRole.STUDENT,
            terms_accepted=data.terms_accepted
        )
        return await self.repo.create(new_user)

    async def authenticate(self, data: UserLogin) -> tuple[User, str]:
        user = await self.repo.get_by_email(data.email)
        if not user or not self._verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive user")
            
        token = self._create_access_token(subject=user.id, role=user.role.value)
        return user, token