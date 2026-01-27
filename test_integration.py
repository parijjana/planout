import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_create_plan_and_tasks():
    print("--- Testing Plan & Task Creation ---")
    
    # 1. Create Plan
    plan_payload = {
        "title": "Integration Test Plan",
        "description": "Testing backend endpoints",
        "color": "#10b981",
        "deadline": datetime.now().isoformat()
    }
    print(f"Creating Plan: {plan_payload['title']}...")
    res = requests.post(f"{BASE_URL}/plans", json=plan_payload)
    if res.status_code != 200:
        print(f"FAILED to create plan: {res.text}")
        return
    
    plan_data = res.json()
    plan_id = plan_data['id']
    print(f"Plan Created. ID: {plan_id}")

    # 2. Add Tasks (Simulating Frontend Payload with Defaults)
    # Scenario: One task with logic defaults, one fully specified
    tasks_payload = [
        {
            "title": "Task 1 (Minimal)",
            "description": "",
            "estimated_hours": 1.0,
            "duration_minutes": 30,
            "frequency": "Daily",
            "deadline": None, # Simulating manual fallback default
            "status": "TODO"
        },
        {
            "title": "Task 2 (Full)",
            "description": " Detailed description",
            "estimated_hours": 5.0,
            "duration_minutes": 60,
            "frequency": "Weekly",
            "deadline": "2024-12-31",
            "status": "TODO"
        }
    ]
    
    print(f"Adding {len(tasks_payload)} Tasks...")
    res = requests.post(f"{BASE_URL}/plans/{plan_id}/chunks", json=tasks_payload)
    
    if res.status_code == 200:
        updated_plan = res.json()
        print("Success! Tasks added.")
        print(f"Plan Chunk Count: {len(updated_plan['chunks'])}")
        for i, chunk in enumerate(updated_plan['chunks']):
            print(f"  - Chunk {i+1}: {chunk['title']} (Deadline: {chunk.get('deadline')})")
    else:
        print(f"FAILED to add tasks: {res.status_code} - {res.text}")

if __name__ == "__main__":
    try:
        test_create_plan_and_tasks()
    except Exception as e:
        print(f"Test Exception: {e}")
