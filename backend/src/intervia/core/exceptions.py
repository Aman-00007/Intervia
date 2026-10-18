from typing import Any
from fastapi import HTTPException


class RFC7807Exception(HTTPException):
    """
    Base exception that formats HTTP errors according to RFC 7807.
    Ensures the React frontend always receives a predictable JSON error structure.
    """
    def __init__(
        self,
        status_code: int,
        title: str,
        detail: str,
        instance: str | None = None,
        custom_type: str = "about:blank",
        additional_data: dict[str, Any] | None = None
    ):
        self.title = title
        self.instance = instance
        self.type = custom_type
        self.additional_data = additional_data or {}
        
        # Pack the standardized RFC 7807 schema into the FastAPI detail field
        formatted_detail = {
            "type": self.type,
            "title": self.title,
            "status": status_code,
            "detail": detail,
        }
        if self.instance:
            formatted_detail["instance"] = self.instance
        
        # Merge any extra debugging data (like which specific field failed)
        formatted_detail.update(self.additional_data)
        
        super().__init__(status_code=status_code, detail=formatted_detail)


class DomainValidationException(RFC7807Exception):
    """Raised when a candidate submits invalid code or fails validation."""
    def __init__(self, detail: str, **kwargs: Any):
        super().__init__(
            status_code=400,
            title="Domain Validation Error",
            detail=detail,
            **kwargs
        )


class SecurityViolationException(RFC7807Exception):
    """Raised when offline HMAC chains break or unauthorized access is detected."""
    def __init__(self, detail: str, **kwargs: Any):
        super().__init__(
            status_code=403,
            title="Security Violation",
            detail=detail,
            custom_type="/errors/security-violation",
            **kwargs
        )