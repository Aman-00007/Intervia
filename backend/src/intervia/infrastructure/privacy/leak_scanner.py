import re
from fastapi import HTTPException

class ZeroPIILeakScanner:
    """Scans AI output models or strings for accidental PII leaks before returning to client."""
    
    # Regex patterns for strict PII detection (Emails, Phone numbers, PAN/Aadhaar formats)
    EMAIL_REGEX = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"
    PHONE_REGEX = r"\b(?:\+?91)?[6-9]\d{9}\b"
    AADHAAR_REGEX = r"\b\d{4}\s\d{4}\s\d{4}\b|\b\d{12}\b"

    @classmethod
    def assert_no_pii(cls, text_content: str) -> None:
        """Raises a 500 error if any raw PII pattern slips through into the final AI report."""
        if not text_content:
            return

        if re.search(cls.EMAIL_REGEX, text_content) or \
           re.search(cls.PHONE_REGEX, text_content) or \
           re.search(cls.AADHAAR_REGEX, text_content):
            raise HTTPException(
                status_code=500,
                detail="🔒 Zero-PII Policy Violation: AI output contained unmasked personal data!"
            )