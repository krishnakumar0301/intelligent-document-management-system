from pydantic import BaseModel


class UserSettingsOut(BaseModel):
    theme: str
    scan_path: str | None
    auto_organize: bool
    watcher_enabled: bool
    notifications_enabled: bool

    model_config = {"from_attributes": True}


class UserSettingsUpdate(BaseModel):
    theme: str | None = None
    scan_path: str | None = None
    auto_organize: bool | None = None
    watcher_enabled: bool | None = None
    notifications_enabled: bool | None = None
