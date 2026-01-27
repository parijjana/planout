
from fastapi.testclient import TestClient
from app.main import app
from app.models import ChunkStatus, Frequency

client = TestClient(app)

def test_create_and_update_workflow():
    # 1. Create Plan
    response = client.post("/plans", json={
        "title": "Workflow Test Plan",
        "description": "Testing Skip/Defer",
        "chunks": []
    })
    assert response.status_code == 200
    plan_id = response.json()["id"]

    # 2. Add Chunk
    response = client.post(f"/plans/{plan_id}/chunks", json=[{
        "title": "Daily Task",
        "description": "Test Task",
        "estimated_hours": 1,
        "frequency": "Daily",
        "status": "TODO"
    }])
    assert response.status_code == 200
    # Fetch plan to get chunks
    response = client.get(f"/plans/{plan_id}")
    chunk_id = response.json()["chunks"][0]["id"]

    # 3. Simulate Skip (Frontend Logic: Update History + Status)
    new_history = {"skipped": ["2023-01-01"]}
    response = client.patch(f"/plans/{plan_id}/chunks/{chunk_id}", json={
        "status": "SKIPPED",
        "history": new_history
    })
    assert response.status_code == 200

    # Verify via GET (Persistence)
    response = client.get(f"/plans/{plan_id}")
    chunk_data = next(c for c in response.json()["chunks"] if c["id"] == chunk_id)
    assert chunk_data["status"] == "SKIPPED"
    assert chunk_data["history"]["skipped"] == ["2023-01-01"]

    # 4. Simulate Defer
    new_history["deferred"] = {"2023-01-02": "2023-01-05"}
    
    response = client.patch(f"/plans/{plan_id}/chunks/{chunk_id}", json={
        "history": new_history
    })
    assert response.status_code == 200

    # Verify via GET
    response = client.get(f"/plans/{plan_id}")
    chunk_data = next(c for c in response.json()["chunks"] if c["id"] == chunk_id)
    assert chunk_data["history"]["deferred"] == {"2023-01-02": "2023-01-05"}
    
    # 5. Verify Persistence (Redundant now but keeps flow)
    assert chunk_data["history"] == new_history

def test_invalid_status_update():
    response = client.post("/plans", json={"title": "Test", "description": "Test", "chunks": []})
    plan_id = response.json()["id"]
    client.post(f"/plans/{plan_id}/chunks", json=[{"title":"T","frequency":"Once","status":"TODO"}])
    response = client.get(f"/plans/{plan_id}")
    chunk_id = response.json()["chunks"][0]["id"]

    response = client.patch(f"/plans/{plan_id}/chunks/{chunk_id}", json={
        "status": "INVALID_STATUS"
    })
    assert response.status_code == 400
