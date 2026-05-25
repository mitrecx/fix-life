from datetime import date
from uuid import UUID

from sqlalchemy import Date, cast
from sqlalchemy.orm import Session

from app.models.quick_note import QuickNote
from app.schemas.quick_note import QuickNoteCreate, QuickNoteResponse


class QuickNoteService:
    def __init__(self, db: Session):
        self.db = db

    def list_notes(
        self,
        user_id: UUID,
        *,
        q: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[QuickNote], int]:
        query = self.db.query(QuickNote).filter(QuickNote.user_id == user_id)

        if q:
            query = query.filter(QuickNote.content.ilike(f"%{q.strip()}%"))
        if date_from is not None:
            query = query.filter(cast(QuickNote.created_at, Date) >= date_from)
        if date_to is not None:
            query = query.filter(cast(QuickNote.created_at, Date) <= date_to)

        total = query.count()
        notes = (
            query.order_by(QuickNote.created_at.asc(), QuickNote.id.asc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return notes, total

    def create_note(self, user_id: UUID, data: QuickNoteCreate) -> QuickNote:
        note = QuickNote(user_id=user_id, content=data.content.strip())
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)
        return note

    def get_note(self, note_id: UUID) -> QuickNote | None:
        return self.db.query(QuickNote).filter(QuickNote.id == note_id).first()

    def delete_note(self, note: QuickNote) -> None:
        self.db.delete(note)
        self.db.commit()

    def delete_notes(self, user_id: UUID, note_ids: list[UUID]) -> int:
        if not note_ids:
            return 0
        deleted = (
            self.db.query(QuickNote)
            .filter(QuickNote.user_id == user_id, QuickNote.id.in_(note_ids))
            .delete(synchronize_session=False)
        )
        self.db.commit()
        return deleted

    @staticmethod
    def to_response(note: QuickNote) -> QuickNoteResponse:
        return QuickNoteResponse.model_validate(note)
