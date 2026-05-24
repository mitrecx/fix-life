from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class QuickNoteCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)


class QuickNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    content: str
    created_at: datetime
    updated_at: datetime


class QuickNoteList(BaseModel):
    notes: list[QuickNoteResponse]
    total: int
