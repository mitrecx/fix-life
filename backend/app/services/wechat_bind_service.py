"""Bind WeChat mini program identities to existing Web accounts."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.backlog_task import BacklogTask
from app.models.daily_progress import DailyProgressDay, DailySummary
from app.models.mcp_api_key import McpApiKey
from app.models.monthly_plan import MonthlyPlan
from app.models.quick_note import QuickNote
from app.models.systemSettings import SystemSettings
from app.models.user import User
from app.models.user_role import UserRole
from app.models.wechat_bind_code import WeChatBindCode
from app.models.weekly_summary import WeeklySummary
from app.models.yearly_goal import YearlyGoal
class WeChatBindError(Exception):
    """Raised when account binding cannot complete."""


BIND_CODE_TTL_MINUTES = 10


class WeChatBindService:
    def __init__(self, db: Session):
        self.db = db

    def create_bind_code(self, user: User) -> WeChatBindCode:
        if not user.is_active:
            raise WeChatBindError("账号已停用")

        self.db.query(WeChatBindCode).filter(
            WeChatBindCode.user_id == user.id,
            WeChatBindCode.used_at.is_(None),
        ).update({"used_at": datetime.now(timezone.utc)}, synchronize_session=False)

        code = self._generate_unique_code()
        record = WeChatBindCode(
            user_id=user.id,
            code=code,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=BIND_CODE_TTL_MINUTES),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def bind_wechat_to_user(
        self,
        *,
        bind_code: str,
        openid: str,
        unionid: str | None,
    ) -> User:
        normalized_code = bind_code.strip()
        if len(normalized_code) != 6 or not normalized_code.isdigit():
            raise WeChatBindError("绑定码格式无效")

        record = (
            self.db.query(WeChatBindCode)
            .filter(
                WeChatBindCode.code == normalized_code,
                WeChatBindCode.used_at.is_(None),
            )
            .order_by(WeChatBindCode.created_at.desc())
            .first()
        )
        if not record or not record.is_valid():
            raise WeChatBindError("绑定码无效或已过期")

        target = self.db.query(User).filter(User.id == record.user_id).first()
        if not target or not target.is_active:
            raise WeChatBindError("目标账号不可用")

        wechat_user = self.db.query(User).filter(User.wechat_openid == openid).first()
        if not wechat_user:
            raise WeChatBindError("未找到微信账号，请先在小程序登录")

        if target.wechat_openid and target.wechat_openid != openid:
            raise WeChatBindError("该 Web 账号已绑定其他微信")

        if wechat_user.id == target.id:
            record.mark_used()
            self.db.commit()
            self.db.refresh(target)
            return target

        if target.wechat_openid == openid:
            record.mark_used()
            self.db.commit()
            self.db.refresh(target)
            return target

        self._merge_wechat_user_into_target(wechat_user, target, openid, unionid)
        record.mark_used()
        self.db.commit()
        self.db.refresh(target)
        return target

    def _merge_wechat_user_into_target(
        self,
        source: User,
        target: User,
        openid: str,
        unionid: str | None,
    ) -> None:
        if source.id == target.id:
            return

        self._reassign_owned_rows(BacklogTask, source.id, target.id)
        self._reassign_owned_rows(MonthlyPlan, source.id, target.id)
        self._reassign_owned_rows(DailyProgressDay, source.id, target.id)
        self._reassign_owned_rows(DailySummary, source.id, target.id)
        self._reassign_owned_rows(QuickNote, source.id, target.id)
        self._reassign_owned_rows(WeeklySummary, source.id, target.id)
        self._reassign_owned_rows(YearlyGoal, source.id, target.id)
        self._reassign_owned_rows(McpApiKey, source.id, target.id)
        self._merge_roles(source, target)
        self._merge_system_settings(source, target)

        source.wechat_openid = None
        source.wechat_unionid = None
        self.db.flush()

        target.wechat_openid = openid
        if unionid:
            target.wechat_unionid = unionid

        self.db.delete(source)
        self.db.flush()

    def _reassign_owned_rows(self, model, source_id: UUID, target_id: UUID) -> None:
        self.db.query(model).filter(model.user_id == source_id).update(
            {model.user_id: target_id},
            synchronize_session=False,
        )

    def _merge_roles(self, source: User, target: User) -> None:
        target_role_ids = {
            row.role_id for row in self.db.query(UserRole).filter(UserRole.user_id == target.id).all()
        }
        source_roles = self.db.query(UserRole).filter(UserRole.user_id == source.id).all()
        for row in source_roles:
            if row.role_id not in target_role_ids:
                self.db.add(UserRole(user_id=target.id, role_id=row.role_id))

    def _merge_system_settings(self, source: User, target: User) -> None:
        target_settings = (
            self.db.query(SystemSettings).filter(SystemSettings.user_id == target.id).first()
        )
        source_settings = (
            self.db.query(SystemSettings).filter(SystemSettings.user_id == source.id).first()
        )
        if not source_settings:
            return
        if target_settings:
            self.db.delete(source_settings)
        else:
            source_settings.user_id = target.id

    def _generate_unique_code(self) -> str:
        for _ in range(20):
            code = f"{secrets.randbelow(1_000_000):06d}"
            exists = self.db.query(WeChatBindCode).filter(
                WeChatBindCode.code == code,
                WeChatBindCode.used_at.is_(None),
                WeChatBindCode.expires_at > datetime.now(timezone.utc),
            ).first()
            if not exists:
                return code
        raise WeChatBindError("暂时无法生成绑定码，请稍后重试")


def is_wechat_placeholder_user(user: User) -> bool:
    email = (user.email or "").lower()
    return bool(user.wechat_openid) and email.endswith("@weixin.fixlife.mitrecx.top")
