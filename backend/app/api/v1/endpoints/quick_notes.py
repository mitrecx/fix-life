from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.api.v1.deps import get_db, require_quick_notes_upload_image
from app.core.config import settings
from app.models.user import User
from app.schemas.quick_note import (
    QuickNoteBatchDelete,
    QuickNoteBatchDeleteResponse,
    QuickNoteBatchMerge,
    QuickNoteBatchMergeResponse,
    QuickNoteCreate,
    QuickNoteImageUploadResponse,
    QuickNoteList,
    QuickNoteResponse,
)
from app.services.media_token import verify_media_token
from app.services.oss_storage import (
    ALLOWED_IMAGE_TYPES,
    MAX_QUICK_NOTE_IMAGE_SIZE,
    OssStorageError,
    OssStorageService,
)
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


@router.post("/upload-image", response_model=QuickNoteImageUploadResponse)
async def upload_quick_note_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_quick_notes_upload_image),
):
    if not settings.OSS_ENABLED:
        raise HTTPException(status_code=503, detail="图片上传服务未配置")

    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的文件类型，请上传 JPG、PNG、GIF 或 WEBP 格式的图片",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="文件为空")
    if len(content) > MAX_QUICK_NOTE_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件大小不能超过 5MB",
        )

    try:
        storage = OssStorageService.from_settings()
        url = storage.upload_quick_note_image(current_user.id, content, content_type)
    except OssStorageError as exc:
        raise HTTPException(status_code=503, detail="图片上传失败，请稍后重试") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return QuickNoteImageUploadResponse(url=url)


@router.get("/media/{token}")
def get_quick_note_media(token: str):
    try:
        object_key = verify_media_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="图片不存在") from exc

    if not settings.OSS_ENABLED:
        raise HTTPException(status_code=503, detail="图片服务未配置")

    try:
        storage = OssStorageService.from_settings()
        content, content_type = storage.get_object(object_key)
    except OssStorageError as exc:
        raise HTTPException(status_code=404, detail="图片不存在") from exc

    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.post("/batch-delete", response_model=QuickNoteBatchDeleteResponse)
def batch_delete_quick_notes(
    data: QuickNoteBatchDelete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = QuickNoteService(db)
    deleted = service.delete_notes(current_user.id, data.ids)
    return QuickNoteBatchDeleteResponse(deleted=deleted)


@router.post("/batch-merge", response_model=QuickNoteBatchMergeResponse)
def batch_merge_quick_notes(
    data: QuickNoteBatchMerge,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = QuickNoteService(db)
    try:
        note, merged = service.merge_notes(current_user.id, data.ids)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return QuickNoteBatchMergeResponse(note=service.to_response(note), merged=merged)


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
