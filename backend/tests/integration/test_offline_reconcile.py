import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from intervia.domains.stage_d_reconciliation.router import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

def test_sync_chain_endpoint_rejects_tampering():
    payload = {
        "session_id": "test-123",
        "events": [
            {"seq": 1, "timestamp_ms": 500, "event_type": "INSERT", "hmac_hash": "invalid"}
        ]
    }
    response = client.post("/v1/reconciliation/sync-chain", json=payload)
    
    # Must explicitly reject with HTTP 403 Forbidden
    assert response.status_code == 403
    assert "tampering detected" in response.json()["detail"]