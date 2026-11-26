from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

Category = Literal["wet", "dry", "hazardous", "other"]
Status = Literal["reported", "in_progress", "resolved"]
CATEGORIES = ("wet", "dry", "hazardous", "other")
STATUSES = ("reported", "in_progress", "resolved")


def _as_utc(v: datetime) -> datetime:
    return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v


class ReportCreated(BaseModel):
    id: int
    tracking_code: str
    status: Status


class ReportTrack(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: Status
    category: Category
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def utc_times(cls, v: datetime) -> datetime:
        return _as_utc(v)


class ReportOut(BaseModel):
    id: int
    tracking_code: str
    category: Category
    note: str | None
    photo_url: str
    latitude: float | None
    longitude: float | None
    status: Status
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def utc_time(cls, v: datetime) -> datetime:
        return _as_utc(v)


class StatusUpdate(BaseModel):
    status: Status


class LoginIn(BaseModel):
    username: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class StatsOut(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]


def report_out(r) -> ReportOut:
    return ReportOut(
        id=r.id,
        tracking_code=r.tracking_code,
        category=r.category,
        note=r.note,
        photo_url=f"/uploads/{r.photo_filename}",
        latitude=r.latitude,
        longitude=r.longitude,
        status=r.status,
        created_at=r.created_at,
    )
