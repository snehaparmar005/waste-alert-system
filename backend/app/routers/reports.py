import secrets

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import MAX_UPLOAD_BYTES, UPLOAD_DIR
from ..database import get_db
from ..models import Report
from ..schemas import CATEGORIES, ReportCreated, ReportTrack

router = APIRouter(prefix="/api/reports", tags=["reports"])

_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O/1/I


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


@router.post("", response_model=ReportCreated, status_code=status.HTTP_201_CREATED)
def create_report(
    photo: UploadFile = File(...),
    category: str = Form(...),
    note: str | None = Form(None),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
    db: Session = Depends(get_db),
):
    if category not in CATEGORIES:
        raise HTTPException(422, "Please choose a valid waste type.")
    note = (note or "").strip() or None
    if note and len(note) > 500:
        raise HTTPException(422, "Note is too long (500 characters max).")
    if (latitude is None) != (longitude is None):
        raise HTTPException(422, "Send both latitude and longitude, or neither.")
    if latitude is not None and not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
        raise HTTPException(422, "Location is out of range.")

    data = photo.file.read(MAX_UPLOAD_BYTES + 1)
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
            note=note,
            photo_filename=filename,
            latitude=latitude,
            longitude=longitude,
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
    return ReportCreated(id=report.id, tracking_code=report.tracking_code, status=report.status)


@router.get("/track/{code}", response_model=ReportTrack)
def track_report(code: str, db: Session = Depends(get_db)):
    report = db.scalar(select(Report).where(Report.tracking_code == code.strip().upper()))
    if report is None:
        raise HTTPException(404, "No report found with that code.")
    return report
