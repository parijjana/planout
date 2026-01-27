
import sys
import os
from datetime import datetime, timedelta
from sqlmodel import Session, select, func

# Add backend to path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app.database import engine
from app.models import Plan, Chunk

def calculate_deadline(chunk: Chunk):
    if not chunk.estimated_hours or chunk.estimated_hours <= 0:
        return None
    
    if not chunk.duration_minutes or chunk.duration_minutes <= 0:
        return None

    # Default to now if not scheduled
    start_date = chunk.scheduled_date or datetime.now()
    
    session_hours = chunk.duration_minutes / 60.0
    sessions_needed = chunk.estimated_hours / session_hours
    
    multiplier = 1
    freq = (chunk.frequency or "Once").lower()
    if freq == 'weekly':
        multiplier = 7
    elif freq == 'monthly':
        multiplier = 30
    
    total_days = int(sessions_needed * multiplier)
    
    # Calculate end date
    end_date = start_date + timedelta(days=total_days)
    return end_date

def main():
    with Session(engine) as session:
        plans = session.exec(select(Plan)).all()
        print(f"Found {len(plans)} plans.")
        
        for plan in plans:
            print(f"Processing Plan: {plan.title}")
            chunks = session.exec(select(Chunk).where(Chunk.plan_id == plan.id)).all()
            
            max_chunk_deadline = None
            
            for chunk in chunks:
                if not chunk.deadline:
                    new_deadline = calculate_deadline(chunk)
                    if new_deadline:
                        chunk.deadline = new_deadline
                        session.add(chunk)
                        print(f"  - Updated Task '{chunk.title}' deadline to {new_deadline.date()}")
                    else:
                        print(f"  - Skipped Task '{chunk.title}' (insufficient data)")
                
                # Track max deadline for plan
                # Use the new one or existing one
                current_deadline = chunk.deadline
                if current_deadline:
                    if not max_chunk_deadline or current_deadline > max_chunk_deadline:
                        max_chunk_deadline = current_deadline

            # Update Plan
            if max_chunk_deadline:
                # If plan deadline is missing or earlier than max_chunk, update it?
                # User said "calculate and populate".
                # I'll update it if it's missing or if we want to sync it.
                # "populate" implies filling missing ones.
                # But logical consistency suggests syncing.
                if not plan.deadline or max_chunk_deadline > plan.deadline:
                     plan.deadline = max_chunk_deadline
                     session.add(plan)
                     print(f"  > Updated Plan Deadline to {max_chunk_deadline.date()}")
            
        session.commit()
        print("Backfill complete.")

if __name__ == "__main__":
    main()
