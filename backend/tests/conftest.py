import pytest
from fastapi.testclient import TestClient
from intervia.main import app

@pytest.fixture
def test_client():
    """Provides a reusable FastAPI test client for all integration tests."""
    with TestClient(app) as client:
        yield client

@pytest.fixture
def dummy_session_id():
    return "test-session-1234-uuid"