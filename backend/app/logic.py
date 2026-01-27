from typing import List
from datetime import datetime, timedelta
from app.models import Chunk, ChunkStatus
import re

def suggest_chunks(description: str) -> List[Chunk]:
    """
    Analyzes the description and returns a list of suggested chunks.
    This is a heuristic implementation for the prototype.
    """
    # Simple heuristic: split by newlines first
    lines = description.split('\n')
    chunks = []
    
    for line in lines:
        clean_line = line.strip()
        if not clean_line:
            continue
            
        # Refined: Split by "Step" if it appears multiple times
        if clean_line.count("Step ") > 1:
            # simple regex split could work, or just naive split
            parts = clean_line.split("Step ")
            for part in parts:
                if part.strip():
                    title = "Step " + part.strip() if not part.strip().startswith("Step") else part.strip()
                    # Fix the prefixing issue from split
                    if part.strip() == clean_line.split("Step ")[0].strip(): # The part before first "Step"
                         if part.strip(): chunks.append(Chunk(title=part.strip()))
                    else:
                        chunks.append(Chunk(title=f"Step {part.strip()}"))
        elif "Step " in clean_line or len(clean_line) > 0:
            chunks.append(Chunk(title=clean_line))
            
    # Fallback if no specific structure found but text exists
    if not chunks and description:
        # Split by sentences? For now, just one chunk
        chunks.append(Chunk(title="Execute plan: " + description[:50]))
        
    return chunks

def schedule_chunks(chunks: List[Chunk], start_date: datetime, chunks_per_day: int = 1) -> List[Chunk]:
    """
    Assigns scheduled_date to chunks based on a simple cadence.
    """
    current_date = start_date
    chunks_scheduled_today = 0
    
    for chunk in chunks:
        chunk.scheduled_date = current_date
        chunks_scheduled_today += 1
        
        if chunks_scheduled_today >= chunks_per_day:
            current_date += timedelta(days=1)
            chunks_scheduled_today = 0
            
    return chunks
