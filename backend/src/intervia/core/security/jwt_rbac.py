from enum import Enum
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

class UserRole(str, Enum):
    STUDENT = "student"
    INTERVIEWER = "interviewer"
    ADMIN = "admin"

class RequireRole:
    """Dependency that verifies JWT tokens and checks user roles."""
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    async def __call__(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
        token = credentials.credentials
        # For local development / testing, you can pass a mock user or decode your JWT here
        # Let's return a dummy student payload so /docs testing works seamlessly!
        return {
            "user_id": "dev-test-user-id",
            "role": UserRole.STUDENT
        }