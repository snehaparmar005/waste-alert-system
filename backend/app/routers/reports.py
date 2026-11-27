import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, aliased, load_only

from ..config import MAX_UPLOAD_BYTES, UPLOAD_DIR
from ..database import get_db
from ..models import Report, User
from ..report_cache import cache_reports, get_cached_reports, invalidate_reports_cache
from ..schemas import (
    CATEGORIES,
    STATUSES,
    ReportCreated,
    ReportListOut,
    ReportOut,
    ReportTrack,
    ReportUpdate,
    report_out,
)
from ..security import AuthenticatedUser, get_current_user, get_optional_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])

_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I
_WORKER_FALLBACK_STATUSES = ("assigned", "in_progress", "cleaned")
_STAFF_ROLES = ("gov", "officer", "admin")
_LIST_COLUMNS = (
    Report.id,
    Report.tracking_code,
    Report.category,
    Report.note,
    Report.photo_filename,
    Report.latitude,
    Report.longitude,
    Report.user_id,
    Report.assigned_worker_id,
    Report.ward,
    Report.description,
    Report.remarks,
    Report.status,
    Report.created_at,
)


def _sniff_image(data: bytes) -> str | None:
    """Return a file extension if the bytes really are a JPEG, PNG or WebP image."""
    if data.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


def _new_code() -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(10))


def _report_conditions(
    current_user: AuthenticatedUser,
    report_status: str | None,
    category: str | None,
):
    conditions = []
    if current_user.role == "citizen":
        conditions.append(Report.user_id == current_user.id)
    elif current_user.role == "worker":
        conditions.append(
            or_(
                Report.assigned_worker_id == current_user.id,
                and_(
                    Report.assigned_worker_id.is_(None),
                    Report.status.in_(_WORKER_FALLBACK_STATUSES),
                ),
            )
        )
    elif current_user.role not in _STAFF_ROLES:
        raise HTTPException(403, "You do not have permission to view reports.")

    if report_status:
        if report_status not in STATUSES:
            raise HTTPException(422, "Unknown status.")
        conditions.append(Report.status == report_status)
    if category:
        if category not in CATEGORIES:
            raise HTTPException(422, "Unknown category.")
        conditions.append(Report.category == category)
    return conditions


def _report_visible_to_user(report: Report, current_user: AuthenticatedUser) -> bool:
    if current_user.role in _STAFF_ROLES:
        return True
    if current_user.role == "citizen":
        return report.user_id == current_user.id
    if current_user.role == "worker":
        return report.assigned_worker_id == current_user.id or (
            report.assigned_worker_id is None
            and report.status in _WORKER_FALLBACK_STATUSES
        )
    return False


@router.get("", response_model=ReportListOut)
def list_reports(
    report_status: str | None = Query(None, alias="status"),
    category: str | None = Query(None),
    limit: int = Query(15, ge=1, le=200),
    page: int = Query(1, ge=1),
    offset: int | None = Query(None, ge=0),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    conditions = _report_conditions(current_user, report_status, category)
    actual_offset = offset if offset is not None else (page - 1) * limit
    actual_page = actual_offset // limit + 1
    cache_key = (
        current_user.role,
        current_user.id,
        report_status,
        category,
        limit,
        actual_page,
        actual_offset,
    )
    cached = get_cached_reports(cache_key)
    if cached is not None:
        return cached

    total = db.scalar(
        select(func.count(Report.id)).where(*conditions)
    ) or 0
    worker = aliased(User)
    statement = (
        select(Report, User.name, worker.name)
        .outerjoin(User, Report.user_id == User.id)
        .outerjoin(worker, Report.assigned_worker_id == worker.id)
        .options(load_only(*_LIST_COLUMNS))
        .where(*conditions)
        .order_by(Report.id.desc())
        .offset(actual_offset)
        .limit(limit)
    )
    rows = db.execute(statement).all()
    items = [
        report_out(report, user_name, worker_name)
        for report, user_name, worker_name in rows
    ]
    result = {
        "items": [item.model_dump(mode="json") for item in items],
        "total": total,
        "page": actual_page,
        "total_pages": (total + limit - 1) // limit,
    }
    cache_reports(cache_key, result)
    return result


@router.post("", response_model=ReportCreated, status_code=status.HTTP_201_CREATED)
def create_report(
    photo: UploadFile | None = File(None),
    file: UploadFile | None = File(None),
    category: str = Form("other"),
    note: str | None = Form(None),
    description: str | None = Form(None),
    remarks: str | None = Form(None),
    ward: str | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser | None = Depends(get_optional_current_user),
):
    uploaded_photo = photo or file
    if uploaded_photo is None:
        raise HTTPException(422, "Please upload a waste photo.")
    if current_user is not None and current_user.role != "citizen":
        raise HTTPException(403, "Only citizens can submit reports.")
    if category not in CATEGORIES:
        raise HTTPException(422, "Please choose a valid waste type.")
    note = (note or "").strip() or None
    if note and len(note) > 500:
        raise HTTPException(422, "Note is too long (500 characters max).")
    if (latitude is None) != (longitude is None):
        raise HTTPException(422, "Send both latitude and longitude, or neither.")
    if latitude is not None and not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise HTTPException(422, "Location is out of range.")

    data = uploaded_photo.file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Photo is too large (5 MB max).")
    ext = _sniff_image(data)
    if ext is None:
        raise HTTPException(415, "Please upload a JPG, PNG or WebP photo.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{secrets.token_hex(16)}{ext}"
    (UPLOAD_DIR / filename).write_bytes(data)

    report = None
    for _ in range(5):  # retry on the (very unlikely) tracking-code collision
        report = Report(
            tracking_code=_new_code(),
            category=category,
            note=note or description,
            photo_filename=filename,
            latitude=latitude,
            longitude=longitude,
            user_id=current_user.id if current_user else None,
            ward=(ward or "").strip() or None,
            description=(description or note or "").strip() or None,
            remarks=(remarks or "").strip() or None,
        )
        db.add(report)
        try:
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            report = None
    if report is None:
        (UPLOAD_DIR / filename).unlink(missing_ok=True)
        raise HTTPException(500, "Could not save the report. Please try again.")
    invalidate_reports_cache()
    return ReportCreated(id=report.id, tracking_code=report.tracking_code, status=report.status)


@router.get("/{report_id}", response_model=ReportOut)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    worker = aliased(User)
    row = db.execute(
        select(Report, User.name, worker.name)
        .outerjoin(User, Report.user_id == User.id)
        .outerjoin(worker, Report.assigned_worker_id == worker.id)
        .where(Report.id == report_id)
    ).first()
    if row is None:
        raise HTTPException(404, "Report not found.")
    report, user_name, worker_name = row
    if not _report_visible_to_user(report, current_user):
        raise HTTPException(403, "You do not have permission to view this report.")
    return report_out(report, user_name, worker_name)


@router.patch("/{report_id}", response_model=ReportOut)
def update_report(
    report_id: int,
    body: ReportUpdate,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(404, "Report not found.")

    fields = body.model_fields_set
    if current_user.role == "citizen":
        if report.user_id != current_user.id or report.status not in ("reported", "submitted"):
            raise HTTPException(403, "Only your unassigned reports can be edited.")
        allowed_fields = {
            "category",
            "corrected_slug",
            "description",
            "remarks",
            "ward",
            "latitude",
            "longitude",
        }
        if fields - allowed_fields:
            raise HTTPException(403, "You cannot change report assignment or status.")
    elif current_user.role == "worker":
        if not _report_visible_to_user(report, current_user):
            raise HTTPException(403, "This task is not assigned to you.")
        if fields != {"status"} or body.status not in ("in_progress", "cleaned"):
            raise HTTPException(403, "Workers may only update their task status.")
    elif current_user.role not in _STAFF_ROLES:
        raise HTTPException(403, "You do not have permission to update reports.")

    if body.assigned_worker_id is not None:
        worker = db.get(User, body.assigned_worker_id)
        if worker is None or worker.role != "worker":
            raise HTTPException(422, "Choose a valid worker account.")
    if ("latitude" in fields) != ("longitude" in fields):
        raise HTTPException(422, "Send both latitude and longitude, or neither.")
    if body.latitude is not None and (
        not -90 <= body.latitude <= 90
        or body.longitude is None
        or not -180 <= body.longitude <= 180
    ):
        raise HTTPException(422, "Location is out of range.")

    if body.status is not None:
        report.status = "reported" if body.status == "submitted" else body.status
    if "assigned_worker_id" in fields:
        report.assigned_worker_id = body.assigned_worker_id
        if body.assigned_worker_id is not None and body.status is None:
            report.status = "assigned"
    if body.category is not None:
        report.category = body.category
    if body.corrected_slug is not None:
        report.category = body.corrected_slug
    for field in ("description", "remarks", "ward", "latitude", "longitude"):
        if field in fields:
            setattr(report, field, getattr(body, field))
    if report.description is not None:
        report.note = report.description

    db.commit()
    worker = aliased(User)
    row = db.execute(
        select(Report, User.name, worker.name)
        .outerjoin(User, Report.user_id == User.id)
        .outerjoin(worker, Report.assigned_worker_id == worker.id)
        .where(Report.id == report_id)
    ).first()
    updated_report, user_name, worker_name = row
    invalidate_reports_cache()
    return report_out(updated_report, user_name, worker_name)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(403, "Administrator access is required.")
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(404, "Report not found.")
    filename = report.photo_filename
    db.delete(report)
    db.commit()
    invalidate_reports_cache()
    (UPLOAD_DIR / filename).unlink(missing_ok=True)
    return None


@router.get("/track/{code}", response_model=ReportTrack)
def track_report(code: str, db: Session = Depends(get_db)):
    report = db.scalar(select(Report).where(Report.tracking_code == code.strip().upper()))
    if report is None:
        raise HTTPException(404, "No report found with that code.")
    return report
