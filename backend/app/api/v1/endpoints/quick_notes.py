from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.quick_note import QuickNoteCreate, QuickNoteList, QuickNoteResponse
from app.services.quick_note_service import QuickNoteService

router = APIRouter()


@router.get("/", response_model=QuickNoteList)
def list_quick_notes(
    q: str | None = Query(None, description="Keyword search in note content"),
    date_from: date | None = Query(None, description="Filter notes created on or after this date"),
    date_to: date | None = Query(None, description="Filter notes created on or before this date"),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(status_code=422, detail="date_from must be on or before date_to")

    service = QuickNoteService(db)
    notes, total = service.list_notes(
        current_user.id,
        q=q,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
        offset=offset,
    )
    return QuickNoteList(
        notes=[service.to_response(note) for note in notes],
        total=total,
    )


@router.post("/", response_model=QuickNoteResponse, status_code=status.HTTP_201_CREATED)
def create_quick_note(
    data: QuickNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = QuickNoteService(db)
    note = service.create_note(current_user.id, data)
    return service.to_response(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quick_note(
    note_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = QuickNoteService(db)
    note = service.get_note(note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if str(note.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized")
    service.delete_note(note)
