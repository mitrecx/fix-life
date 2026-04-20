"""System-wide endpoints (health of dependencies, etc.)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, require_system_status_permission
from app.schemas.system_status import SystemStatusResponse
from app.services.system_status_service import SystemStatusService

router = APIRouter()


@router.get("/status", response_model=SystemStatusResponse)
def get_system_status(
    db: Session = Depends(get_db),
    _user=Depends(require_system_status_permission),
):
    return SystemStatusService(db).run()
