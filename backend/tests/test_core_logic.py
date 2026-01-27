import pytest
from datetime import datetime, timedelta
from app.models import Plan, Chunk, ChunkStatus
from app.logic import suggest_chunks, schedule_chunks

# Mocking a "Smart" breakdown for the prototype (later replaced by LLM or manual)
def test_create_plan_model():
    plan = Plan(title="Learn Guitar", description="Master the basics of acoustic guitar")
    assert plan.title == "Learn Guitar"
    assert plan.created_at is not None
    assert len(plan.chunks) == 0

def test_add_chunk_to_plan():
    plan = Plan(title="Learn Guitar")
    chunk = Chunk(title="Buy a Guitar", estimated_hours=2)
    plan.chunks.append(chunk)
    assert len(plan.chunks) == 1
    assert plan.chunks[0].status == ChunkStatus.TODO

def test_chunk_status_update():
    chunk = Chunk(title="Test Chunk")
    assert chunk.status == ChunkStatus.TODO
    chunk.mark_in_progress()
    assert chunk.status == ChunkStatus.IN_PROGRESS
    chunk.mark_done()
    assert chunk.status == ChunkStatus.DONE

def test_suggest_chunks_simple_heuristic():
    """
    Test a simple heuristic splitter.
    If input is "Do A, then Do B", it should suggest chunks.
    For prototype, just testing the interface returns a list.
    """
    description = "Step 1: Buy strings. Step 2: Restring."
    suggested = suggest_chunks(description)
    assert isinstance(suggested, list)
    assert len(suggested) >= 2
    assert suggested[0].title != ""

def test_schedule_chunks_cadence():
    """
    Test that chunks are assigned dates based on a cadence (e.g., 1 chunk per day).
    """
    chunks = [
        Chunk(title="C1", estimated_hours=1),
        Chunk(title="C2", estimated_hours=1),
        Chunk(title="C3", estimated_hours=1)
    ]
    start_date = datetime.now()
    # Schedule 1 per day
    scheduled = schedule_chunks(chunks, start_date=start_date, chunks_per_day=1)
    
    assert len(scheduled) == 3
    assert scheduled[0].scheduled_date.date() == start_date.date()
    assert scheduled[1].scheduled_date.date() == (start_date + timedelta(days=1)).date()
    assert scheduled[2].scheduled_date.date() == (start_date + timedelta(days=2)).date()
