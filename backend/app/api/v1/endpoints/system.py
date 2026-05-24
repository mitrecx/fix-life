"""System-wide endpoints (health of dependencies, etc.)."""
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.v1.deps import get_db, require_system_status_permission
from app.rate_limit.ban_admin import IpBanAdminService
from app.schemas.ip_ban import BannedIpItem, BannedIpListResponse
from app.schemas.system_status import SystemStatusResponse
from app.services.system_status_service import SystemStatusService

router = APIRouter()


@router.get("/status", response_model=SystemStatusResponse)
def get_system_status(
    db: Session = Depends(get_db),
    _user=Depends(require_system_status_permission),
):
    return SystemStatusService(db).run()


@router.get("/ip-bans", response_model=BannedIpListResponse)
async def list_ip_bans(_user=Depends(require_system_status_permission)):
    service = IpBanAdminService.from_settings()
    try:
        records = await service.list_banned_ips()
    finally:
        await service.close()
    return BannedIpListResponse(
        items=[
            BannedIpItem(
                ip=r.ip,
                scope=r.scope,
                ttl_seconds=r.ttl_seconds,
                request_count=r.request_count,
            )
            for r in records
        ]
    )


@router.delete("/ip-bans/{ip}", status_code=status.HTTP_204_NO_CONTENT)
async def unban_ip(
    ip: str,
    scope: str = Query(..., description="Rate limit scope, e.g. auth_login"),
    _user=Depends(require_system_status_permission),
) -> Response:
    service = IpBanAdminService.from_settings()
    try:
        removed = await service.unban_ip(scope, ip)
    finally:
        await service.close()
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到该 IP 封禁记录")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
