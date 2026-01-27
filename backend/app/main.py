from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional
from app.models import Plan, Chunk, ChunkStatus, Frequency, PlanRead, PlanCreate, PlanUpdate
from app.database import create_db_and_tables, get_session
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.logic import suggest_chunks, schedule_chunks
from datetime import datetime
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

# Trigger Reload
app = FastAPI(title="Planout API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Force Reload for Env Vars
@app.get("/config/ai-status")
def get_ai_status():
    from app.gemini import is_configured
    return {"configured": is_configured()}

from sqlalchemy.orm import selectinload

@app.get("/plans", response_model=List[PlanRead])
def read_plans(session: Session = Depends(get_session)):
    plans = session.exec(select(Plan).options(selectinload(Plan.chunks))).all()
    return plans

@app.post("/plans", response_model=PlanRead)
def create_plan(plan_in: PlanCreate, session: Session = Depends(get_session)):
    # Convert PlanCreate to Plan
    db_plan = Plan.from_orm(plan_in)
    session.add(db_plan)
    session.commit()
    session.refresh(db_plan)
    return db_plan

from app.models import Plan, Chunk, ChunkStatus, Frequency, PlanRead, PlanCreate, PlanUpdate

# ... imports ...

@app.get("/plans/{plan_id}", response_model=PlanRead)
def get_plan(plan_id: str, session: Session = Depends(get_session)):
    plan = session.exec(select(Plan).where(Plan.id == plan_id).options(selectinload(Plan.chunks))).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan

@app.patch("/plans/{plan_id}", response_model=PlanRead)
def update_plan(plan_id: str, plan_update: PlanUpdate, session: Session = Depends(get_session)):
    plan = session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if plan_update.title is not None:
        plan.title = plan_update.title
    if plan_update.description is not None:
        plan.description = plan_update.description
    if plan_update.color is not None:
        plan.color = plan_update.color
        
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan

from app.gemini import generate_plan_suggestions

@app.post("/plans/{plan_id}/breakdown", response_model=PlanRead)
def breakdown_plan(plan_id: str, session: Session = Depends(get_session)):
    plan = session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Run logic
    new_chunks = suggest_chunks(plan.description)
    
    # Schedule them
    scheduled_chunks = schedule_chunks(new_chunks, start_date=datetime.now())
    
    for chunk in scheduled_chunks:
        chunk.plan = plan
        session.add(chunk)
    
    session.commit()
    # Need to reload chunks relation
    session.refresh(plan)
    # Or rely on eager loading if session keeps it, but safer to re-query if needed or trust lazy
    # With PlanRead, it expects chunks list. 
    # session.refresh(plan) might not load 'chunks' if it was accessed before or simple refresh.
    # We can rely on returned object having 'chunks' property which is a list.
    return plan

@app.post("/plans/{plan_id}/suggest")
def suggest_plan_breakdown(plan_id: str, session: Session = Depends(get_session)):
    plan = session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    suggestions = generate_plan_suggestions(plan.title, plan.description, plan.deadline)
    return suggestions

from app.gemini import generate_chunk_details

class ChunkSuggestionRequest(BaseModel):
    title: str

@app.post("/chunks/suggest_details")
def suggest_chunk_details_endpoint(req: ChunkSuggestionRequest):
    return generate_chunk_details(req.title)

@app.post("/plans/{plan_id}/chunks")
def add_chunks(plan_id: str, chunks: List[Chunk], session: Session = Depends(get_session)):
    try:
        plan = session.get(Plan, plan_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        scheduled_chunks = schedule_chunks(chunks, start_date=datetime.now())
        
        for chunk in scheduled_chunks:
            chunk.plan = plan  # Associate
            # Defensive conversion for SQLite
            if isinstance(chunk.deadline, str):
                try:
                    # Handle ISO format (JS sends this)
                    chunk.deadline = datetime.fromisoformat(chunk.deadline.replace('Z', '+00:00'))
                except ValueError:
                    try:
                        # Handle simple date (YYYY-MM-DD)
                        chunk.deadline = datetime.strptime(chunk.deadline, "%Y-%m-%d")
                    except ValueError:
                        chunk.deadline = None # Fallback

            session.add(chunk)
        
        session.commit()
        session.refresh(plan)
        return plan
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

class ChunkUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    duration_minutes: Optional[int] = None
    frequency: Optional[str] = None
    deadline: Optional[datetime] = None
    history: Optional[dict] = None

def recalculate_plan_deadline(session: Session, plan_id: str):
    plan = session.get(Plan, plan_id)
    if not plan: return
    # session.refresh(plan) # Ensure chunks are loaded?
    # Using SQL to aggregate might be faster but loading is fine for now
    # We need to ensure chunks are loaded. PlanRead loads them via selectinload.
    # Here we are in a request where we might have just added/updated.
    # Let's simple query:
    chunks = session.exec(select(Chunk).where(Chunk.plan_id == plan_id)).all()
    deadlines = [c.deadline for c in chunks if c.deadline]
    if deadlines:
        plan.deadline = max(deadlines)
    else:
        plan.deadline = None
    session.add(plan)
    session.commit()
    session.refresh(plan)

@app.patch("/plans/{plan_id}/chunks/{chunk_id}")
def update_chunk(plan_id: str, chunk_id: str, update: ChunkUpdate, session: Session = Depends(get_session)):
    # Verify plan exists (optional but good practice)
    plan = session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    chunk = session.get(Chunk, chunk_id)
    if not chunk or chunk.plan_id != plan_id:
        raise HTTPException(status_code=404, detail="Chunk not found")
        
    if update.title is not None:
        chunk.title = update.title
    if update.description is not None:
        chunk.description = update.description
    if update.status is not None:
        if update.status not in ["TODO", "IN_PROGRESS", "DONE", "SKIPPED", "DEFERRED"]:
             raise HTTPException(status_code=400, detail="Invalid status")
        chunk.status = ChunkStatus(update.status)
    if update.duration_minutes is not None:
        chunk.duration_minutes = update.duration_minutes
    if update.frequency is not None:
        # Robust enum conversion
        try:
            chunk.frequency = Frequency(update.frequency)
        except ValueError:
             chunk.frequency = update.frequency # Fallback or error? Using string for now provided logic supports it. Models says Enum.
    if update.deadline is not None:
        chunk.deadline = update.deadline
    if update.history is not None:
        chunk.history = update.history
    
    session.add(chunk)
    session.commit()
    session.refresh(chunk)
    
    recalculate_plan_deadline(session, plan_id)
    
    return chunk

class ApiKeyUpdate(BaseModel):
    key: str

@app.post("/config/api-key")
def set_api_key(update: ApiKeyUpdate):
    # Update current process
    os.environ["GEMINI_API_KEY"] = update.key
    
    # Update .env file
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    try:
        # Simple .env writer
        lines = []
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                lines = f.readlines()
        
        updated = False
        new_lines = []
        for line in lines:
            if line.strip().startswith("GEMINI_API_KEY="):
                new_lines.append(f"GEMINI_API_KEY={update.key}\n")
                updated = True
            else:
                new_lines.append(line)
        
        if not updated:
            if new_lines and not new_lines[-1].endswith('\n'):
                 new_lines.append('\n')
            new_lines.append(f"GEMINI_API_KEY={update.key}\n")
            
        with open(env_path, 'w') as f:
            f.writelines(new_lines)
            
        return {"status": "success"}
    except Exception as e:
        print(f"Error writing .env: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/plans/{plan_id}/chunks/{chunk_id}")
def delete_chunk(plan_id: str, chunk_id: str, session: Session = Depends(get_session)):
    plan = session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    chunk = session.get(Chunk, chunk_id)
    if not chunk or chunk.plan_id != plan_id:
        raise HTTPException(status_code=404, detail="Chunk not found")
    
    session.delete(chunk)
    session.commit()
    recalculate_plan_deadline(session, plan_id)
    return {"message": "Chunk deleted"}

@app.delete("/plans/{plan_id}")
def delete_plan(plan_id: str, session: Session = Depends(get_session)):
    plan = session.get(Plan, plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Cascade delete chunks (if not handled by DB FK)
    # SQLModel doesn't auto-cascade python objects unless configured, but DB FK usually does if set.
    # Manually deleting to be safe and explicit or relying on relationship
    for chunk in plan.chunks:
        session.delete(chunk)
    
    session.delete(plan)
    session.commit()
    return {"message": "Plan deleted"}
