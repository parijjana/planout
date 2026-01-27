from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Planout API with Persistence"}

def test_create_plan():
    response = client.post("/plans", json={"title": "My Plan", "description": "Do stuff"})
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "My Plan"
    assert "id" in data

def test_get_plan_404():
    response = client.get("/plans/non-existent-id")
    assert response.status_code == 404

def test_auto_chunk_and_schedule():
    # 1. Create
    desc = "Step 1: Do A. Step 2: Do B."
    create_res = client.post("/plans", json={"title": "Auto Plan", "description": desc})
    assert create_res.status_code == 200
    plan_id = create_res.json()["id"]

    # 2. Breakdown
    breakdown_res = client.post(f"/plans/{plan_id}/breakdown")
    assert breakdown_res.status_code == 200
    chunks = breakdown_res.json()["chunks"]
    assert len(chunks) >= 2
    
    # 3. Verify Persistence
    get_res = client.get(f"/plans/{plan_id}")
    assert len(get_res.json()["chunks"]) >= 2
