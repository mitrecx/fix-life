from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime


class SystemSettingsBase(BaseModel):
    show_daily_summary: bool = False
    weekly_summary_email_enabled: bool = False
    weekly_summary_email: str | None = None
    weekly_summary_feishu_enabled: bool = False
    feishu_app_id: str | None = None
    feishu_app_secret: str | None = None
    feishu_chat_id: str | None = None


class SystemSettingsCreate(SystemSettingsBase):
    pass


class SystemSettingsUpdate(BaseModel):
    show_daily_summary: bool | None = None
    weekly_summary_email_enabled: bool | None = None
    weekly_summary_email: str | None = None
    weekly_summary_feishu_enabled: bool | None = None
    feishu_app_id: str | None = Field(None, min_length=1, max_length=100)
    feishu_app_secret: str | None = Field(None, min_length=1, max_length=200)
    feishu_chat_id: str | None = Field(None, min_length=1, max_length=100)


class SystemSettingsInDB(SystemSettingsBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class SystemSettingsResponse(SystemSettingsInDB):
    pass
