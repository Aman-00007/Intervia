import pytest
from intervia.domains.stage_d_reconciliation.service import ReconciliationService
import hmac
import hashlib

@pytest.fixture
def hmac_service():
    return ReconciliationService(secret_key="test_secret")

def test_valid_hmac_chain(hmac_service):
    secret = b"test_secret"
    # Build a mathematically perfect chain
    prev_hash = "INIT"
    payload = f"1:1000:INSERT:{prev_hash}"
    hash1 = hmac.new(secret, payload.encode(), hashlib.sha256).hexdigest()
    
    events = [{"seq": 1, "timestamp_ms": 1000, "event_type": "INSERT", "hmac_hash": hash1}]
    
    assert hmac_service.verify_hmac_chain(events) == True

def test_tampered_hmac_chain(hmac_service):
    # Candidate tries to sneak in an event with a fake hash
    events = [{"seq": 1, "timestamp_ms": 1000, "event_type": "PASTE", "hmac_hash": "fake_hash_123"}]
    assert hmac_service.verify_hmac_chain(events) == False