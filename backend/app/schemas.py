from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator

Category = Literal["wet", "dry", "hazardous", "other"]
Status = Literal[
    "reported",
    "submitted",
    "assigned",
    "in_progress",
    "cleaned",
    "rejected",
    "resolved",
]
CATEGORIES = ("wet", "dry", "hazardous", "other")
STATUSES = ("reported", "submitted", "assigned", "in_progress", "cleaned", "rejected", "resolved")
ROLES = ("citizen", "gov", "officer", "worker", "admin")


def _as_utc(v: datetime) -> datetime:
    return v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v


class ReportCreated(BaseModel):
    id: int
    tracking_code: str
    status: Status


class PortalUserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str


class PortalSessionOut(BaseModel):
    token: str
    user: PortalUserOut


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
    reference_id: str
    category: Category
    corrected_slug: Category
    waste_type: str
    note: str | None
    description: str | None
    remarks: str | None
    ward: str | None
    image_url: str
    photo_url: str
    latitude: float | None
    longitude: float | None
    user_id: int | None
    user_name: str | None
    assigned_worker_id: int | None
    assigned_worker_name: str | None
    status: str
    created_at: datetime

    @field_validator("created_at")
    @classmethod
    def utc_time(cls, v: datetime) -> datetime:
        return _as_utc(v)


class ReportListOut(BaseModel):
    items: list[ReportOut]
    total: int
    page: int
    total_pages: int


class StatusUpdate(BaseModel):
    status: Status


class ReportUpdate(BaseModel):
    status: Status | None = None
    assigned_worker_id: int | None = None
    category: Category | None = None
    corrected_slug: Category | None = None
    description: str | None = None
    remarks: str | None = None
    ward: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class LoginIn(BaseModel):
    username: str
    password: str


class PortalLoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    name: str
    email: str
    password: str


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str


class UserUpdate(BaseModel):
    name: str
    email: str
    role: str


class WorkerCreate(BaseModel):
    name: str
    email: str
    password: str


class WorkerUpdate(BaseModel):
    name: str
    email: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class StatsOut(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]


def report_out(
    r,
    user_name: str | None = None,
    assigned_worker_name: str | None = None,
) -> ReportOut:
    labels = {
        "wet": "Wet",
        "dry": "Dry",
        "hazardous": "Hazardous",
        "other": "Other",
    }
    image_url = f"/uploads/{r.photo_filename}"
    return ReportOut(
        id=r.id,
        tracking_code=r.tracking_code,
        reference_id=f"C2C-{r.id:03d}",
        category=r.category,
        corrected_slug=r.category,
        waste_type=labels.get(r.category, r.category),
        note=r.note,
        description=r.description or r.note,
        remarks=r.remarks,
        ward=r.ward,
        image_url=image_url,
        photo_url=image_url,
        latitude=r.latitude,
        longitude=r.longitude,
        user_id=r.user_id,
        user_name=user_name,
        assigned_worker_id=r.assigned_worker_id,
        assigned_worker_name=assigned_worker_name,
        status=r.status,
        created_at=r.created_at,
    )
