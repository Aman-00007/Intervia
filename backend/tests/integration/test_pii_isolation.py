import pytest
from intervia.infrastructure.privacy.leak_scanner import ZeroPIILeakScanner
from fastapi import HTTPException

def test_pii_isolation_blocks_emails():
    leaky_transcript = "The candidate's email is john.doe@gmail.com, they did well."
    
    with pytest.raises(HTTPException) as exc_info:
        ZeroPIILeakScanner.assert_no_pii(leaky_transcript)
        
    assert exc_info.value.status_code == 500
    assert "Zero-PII Policy Violation" in exc_info.value.detail

def test_pii_isolation_allows_clean_data():
    clean_transcript = "The candidate explained binary search trees perfectly."
    
    # Should not raise an exception
    ZeroPIILeakScanner.assert_no_pii(clean_transcript)