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


class QuickNoteImageUploadResponse(BaseModel):
    url: str


class QuickNoteBatchDelete(BaseModel):
    ids: list[UUID] = Field(..., min_length=1, max_length=200)


class QuickNoteBatchDeleteResponse(BaseModel):
    deleted: int


class QuickNoteBatchMerge(BaseModel):
    ids: list[UUID] = Field(..., min_length=2, max_length=200)


class QuickNoteBatchMergeResponse(BaseModel):
    note: QuickNoteResponse
    merged: int
