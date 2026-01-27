from fastapi.testclient import TestClient
from app.main import app
from app.models import Plan

client = TestClient(app)

def test_suggest_chunks_mock():
    # 1. Create a plan
    create_res = client.post("/plans", json={"title": "Learn React", "description": "I want to enable a simple ux"})
    plan_id = create_res.json()["id"]

    # 2. Request suggestions
    res = client.post(f"/plans/{plan_id}/suggest")
    assert res.status_code == 200
    suggestions = res.json()
    
    assert isinstance(suggestions, list)
    assert len(suggestions) > 0
    # Check structure of suggestion
    assert "title" in suggestions[0]
    assert "estimated_hours" in suggestions[0]
    
    # 3. Ensure they are NOT added to plan yet (user must review)
    get_res = client.get(f"/plans/{plan_id}")
    plan = get_res.json()
    assert len(plan["chunks"]) == 0
