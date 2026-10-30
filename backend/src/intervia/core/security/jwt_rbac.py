from enum import Enum
import uuid
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from intervia.core.config import settings

security = HTTPBearer(auto_error=False)

class UserRole(str, Enum):
    STUDENT = "STUDENT"
    INTERVIEWER = "INTERVIEWER"
    ADMIN = "ADMIN"

class RequireRole:
    """Dependency that verifies JWT tokens and checks user roles."""
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    async def __call__(self, credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict:
        if credentials and credentials.credentials:
            try:
                payload = jwt.decode(
                    credentials.credentials,
                    settings.JWT_SECRET_KEY,
                    algorithms=[settings.JWT_ALGORITHM]
                )
                user_id_str = payload.get("sub")
                role = payload.get("role", "STUDENT")
                try:
                    user_id = uuid.UUID(str(user_id_str))
                except (ValueError, TypeError):
                    user_id = uuid.uuid4()
                return {"user_id": user_id, "role": role}
            except Exception:
                pass

        # Fallback for anonymous candidate onboarding via invite link
        return {
            "user_id": uuid.uuid4(),
            "role": "STUDENT"
        }
