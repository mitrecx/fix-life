from pydantic import BaseModel, ConfigDict
from datetime import datetime


class SystemSettingsBase(BaseModel):
    show_daily_summary: bool = False


class SystemSettingsCreate(SystemSettingsBase):
    pass


class SystemSettingsUpdate(BaseModel):
    show_daily_summary: bool | None = None


class SystemSettingsInDB(SystemSettingsBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


class SystemSettingsResponse(SystemSettingsInDB):
    pass
