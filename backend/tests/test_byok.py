import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# We need to mock the environment BEFORE importing api.main 
# (simulating the behavior when started with empty env)
with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
    from app.main import app

client = TestClient(app)

def test_ai_status_endpoint():
    """Check that the config endpoint reports status based on env var."""
    # Patch the DEFAULT_API_KEY in gemini module, as that's what is checked/used.
    with patch("app.gemini.DEFAULT_API_KEY", ""):
        response = client.get("/config/ai-status")
        assert response.status_code == 200
        assert response.json() == {"configured": False}

def test_suggest_plan_without_key():
    """Test that calling suggest without key returns fallback data (since code swallows error)."""
    with patch("app.gemini.DEFAULT_API_KEY", ""):
        response = client.post(
            "/chunks/suggest_details", 
            json={"title": "Test Chunk"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Could not generate details."

def test_suggest_with_header_key():
    """Test that passing the key in header allows the call to proceed."""
    with patch("app.gemini.DEFAULT_API_KEY", ""), \
         patch("app.gemini.genai.GenerativeModel") as MockModel:
        
        # Setup Mock for generate_content
        mock_response = MagicMock()
        mock_response.text = '{"description": "AI Generated", "duration_minutes": 45, "frequency": "Weekly"}'
        
        mock_model_instance = MockModel.return_value
        mock_model_instance.generate_content.return_value = mock_response

        response = client.post(
            "/chunks/suggest_details", 
            json={"title": "Test Chunk"},
            headers={"x-gemini-api-key": "test_header_key"}
        )
        
        assert response.status_code == 200
        # Verify generate_content was called
        assert mock_model_instance.generate_content.called
