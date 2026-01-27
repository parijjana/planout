from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from uuid import uuid4
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import JSON, Column

class ChunkStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    SKIPPED = "SKIPPED" # Added status for visualization
    DEFERRED = "DEFERRED" # Added status for visualization

class Frequency(str, Enum):
    ONCE = "Once"
    DAILY = "Daily"
    WEEKLY = "Weekly"
    MONTHLY = "Monthly"

class ChunkBase(SQLModel):
    title: str
    description: Optional[str] = None
    status: ChunkStatus = ChunkStatus.TODO
    estimated_hours: float = 1.0
    duration_minutes: int = 30
    frequency: str = "Daily"
    scheduled_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    history: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    # Add ID here if needed for Update models, or separate

class Chunk(ChunkBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    plan_id: Optional[str] = Field(default=None, foreign_key="plan.id")
    plan: Optional["Plan"] = Relationship(back_populates="chunks")

    def mark_in_progress(self):
        self.status = ChunkStatus.IN_PROGRESS

    def mark_done(self):
        self.status = ChunkStatus.DONE

class PlanBase(SQLModel):
    title: str
    description: str = ""
    color: str = "#3b82f6"
    created_at: datetime = Field(default_factory=datetime.now)
    deadline: Optional[datetime] = None

class Plan(PlanBase, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    chunks: List["Chunk"] = Relationship(back_populates="plan", sa_relationship_kwargs={"cascade": "all, delete"})

class PlanRead(PlanBase):
    id: str
    chunks: List[Chunk] = []

class PlanCreate(PlanBase):
    pass

class PlanUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    deadline: Optional[datetime] = None
    # Chunk updates handled separately

