import os
import uuid
from fastapi import UploadFile, HTTPException
from database import get_db_connection
from classifier import predict_image, CANONICAL_CLASSES

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_BYTES = 8 * 1024 * 1024  # 8 MB

LABEL_BY_SLUG = {c["slug"]: c["label"] for c in CANONICAL_CLASSES}

def serialize_report(row: dict) -> dict:
    slug = row["category_slug"]
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "user_name": row.get("user_name"),
        "image_url": row["image_path"],
        "category": {
            "slug": slug,
            "label": LABEL_BY_SLUG.get(slug, slug),
        },
        "corrected_slug": row.get("corrected_slug"),
        "confidence": float(row["confidence"]),
        "needs_retake": bool(row["needs_retake"]),
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "ward": row.get("ward") or "Ward 12 - Morar",
        "remarks": row.get("remarks") or "",
        "status": row["status"],
        "created_at": row["created_at"].isoformat() if hasattr(row["created_at"], "isoformat") else str(row["created_at"]),
    }

async def create_report_pipeline(
    user_id: int,
    file: UploadFile,
    latitude: float,
    longitude: float,
    remarks: str = "",
    ward: str = "Ward 12 - Morar",
) -> dict:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WEBP images are accepted.")

    raw_bytes = await file.read()
    if len(raw_bytes) == 0 or len(raw_bytes) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="Image must be non-empty and under 8MB.")

    ext = os.path.splitext(file.filename or "upload.jpg").lower() or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    saved_path = os.path.join(UPLOAD_DIR, filename)
    public_url = f"/uploads/{filename}"

    with open(saved_path, "wb") as f:
        f.write(raw_bytes)

    try:
        prediction = predict_image(saved_path)
    except Exception as exc:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=500, detail=f"Model inference failed: {exc}")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reports
                (user_id, image_path, category_slug, confidence, needs_retake, latitude, longitude, ward, remarks, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'reported')
                """,
                (
                    user_id,
                    public_url,
                    prediction["slug"],
                    prediction["confidence"],
                    prediction["needs_retake"],
                    latitude,
                    longitude,
                    ward,
                    remarks,
                ),
            )
            report_id = cur.lastrowid

            cur.execute(
                """
                INSERT INTO alerts (report_id, ward, channel, delivery_status, error_message)
                VALUES (%s, %s, 'outbox_queue', 'queued', NULL)
                """,
                (report_id, ward),
            )

            cur.execute(
                """
                SELECT r.*, u.name AS user_name
                FROM reports r
                JOIN users u ON r.user_id = u.id
                WHERE r.id = %s
                """,
                (report_id,),
            )
            created_row = cur.fetchone()
        conn.commit()
        return serialize_report(created_row)
    except Exception as exc:
        conn.rollback()
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(status_code=500, detail=f"Database transaction failed: {exc}")
    finally:
        conn.close()
