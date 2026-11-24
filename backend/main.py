import base64
import gc
import hashlib
import hmac
import io
import os
import tempfile
from typing import Optional

import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel

from database import get_db_connection


app = FastAPI(title="Click-2-Clean API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
MODEL_PATH = os.path.join(BASE_DIR, "waste_classifier.keras")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

CLASSES = [
    {"slug": "biodegradable", "label": "Biodegradable"},
    {"slug": "hazardous", "label": "Hazardous"},
    {"slug": "non_biodegradable", "label": "Non-biodegradable"},
]
LABEL_MAP = {category["slug"]: category["label"] for category in CLASSES}
VALID_SLUGS = set(LABEL_MAP)
VALID_STATUSES = {"reported", "assigned", "cleaned"}
SECRET_KEY = os.getenv("SECRET_KEY", "click2clean-super-secret-key-2026")
_model = None


def create_token(user_id: int) -> str:
    payload = str(user_id)
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    token_data = f"{payload}:{signature}".encode("utf-8")
    return base64.urlsafe_b64encode(token_data).decode("ascii")


def verify_token(token: str) -> Optional[int]:
    try:
        decoded = base64.urlsafe_b64decode(token.encode("ascii")).decode("utf-8")
        user_id_text, signature = decoded.split(":", 1)
        expected = hmac.new(
            SECRET_KEY.encode("utf-8"),
            user_id_text.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if not user_id_text.isdecimal() or not hmac.compare_digest(signature, expected):
            return None
        user_id = int(user_id_text)
        return user_id if user_id > 0 else None
    except (ValueError, UnicodeError):
        return None


def predict_waste(image_path: str) -> dict:
    global _model
    if _model is None:
        import tensorflow as tf

        _model = tf.keras.models.load_model(MODEL_PATH, compile=False)

    with Image.open(image_path) as source:
        image = source.convert("RGB").resize((224, 224))
    image_array = np.asarray(image, dtype=np.float32)
    try:
        predictions = _model.predict(np.expand_dims(image_array, axis=0), verbose=0)[0]
        index = int(np.argmax(predictions))
        confidence = round(float(predictions[index]), 4)
    finally:
        gc.collect()

    return {
        "slug": CLASSES[index]["slug"],
        "label": CLASSES[index]["label"],
        "confidence": confidence,
        "needs_retake": confidence < 0.65,
    }


def hash_pw(password: str) -> str:
    salt = os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000
    ).hex()
    return f"{salt}${digest}"


def verify_pw(password: str, stored: str) -> bool:
    try:
        salt_text, digest_text = stored.split("$", 1)
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt_text.encode("utf-8"),
            100000,
        ).hex()
        return hmac.compare_digest(actual, digest_text)
    except (ValueError, UnicodeError):
        return False


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    user_id = verify_token(authorization.split(" ", 1)[1].strip())
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid session.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, email, role FROM users WHERE id = %s", (user_id,)
            )
            user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="User not found.")
        return user
    finally:
        conn.close()


class LoginSchema(BaseModel):
    email: str
    password: str


class RegisterSchema(BaseModel):
    name: str
    email: str
    password: str


class PatchReportSchema(BaseModel):
    status: Optional[str] = None
    corrected_slug: Optional[str] = None


def seed_users() -> None:
    demo_users = [
        ("Aarav Sharma", "citizen@test.com", "citizen"),
        ("Officer Verma", "officer@nagarnigam.gov.in", "gov"),
        ("Ramesh Patel", "worker@nagarnigam.gov.in", "worker"),
        ("System Admin", "admin@nagarnigam.gov.in", "admin"),
    ]
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("ALTER TABLE reports MODIFY COLUMN image_path LONGTEXT")
            cur.execute(
                "ALTER TABLE users MODIFY COLUMN role "
                "VARCHAR(32) NOT NULL DEFAULT 'citizen'"
            )
            for name, email, role in demo_users:
                cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                if cur.fetchone() is None:
                    cur.execute(
                        "INSERT INTO users (name, email, password_hash, role) "
                        "VALUES (%s, %s, %s, %s)",
                        (name, email, hash_pw("password123"), role),
                    )
        conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def on_startup() -> None:
    seed_users()


@app.get("/")
def root_health() -> dict:
    return {"status": "ok", "service": "Click-2-Clean API"}


@app.post("/api/register", status_code=201)
def register(payload: RegisterSchema) -> dict:
    name = payload.name.strip()
    email = payload.email.strip().lower()
    if not name or not email or not payload.password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email = %s", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Email is already registered.")
            cur.execute(
                "INSERT INTO users (name, email, password_hash, role) "
                "VALUES (%s, %s, %s, 'citizen')",
                (name, email, hash_pw(payload.password)),
            )
        conn.commit()
        return {"message": "Registered"}
    finally:
        conn.close()


@app.post("/api/login")
def login(payload: LoginSchema) -> dict:
    seed_users()
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, email, role, password_hash FROM users WHERE email = %s",
                (payload.email.strip().lower(),),
            )
            user = cur.fetchone()
    finally:
        conn.close()

    if not user or not verify_pw(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    public_user = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
    }
    return {"token": create_token(user["id"]), "user": public_user, **public_user}


@app.post("/api/logout")
def logout() -> dict:
    return {"message": "Logged out"}


@app.get("/api/profile")
def get_profile(user: dict = Depends(get_current_user)) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS total FROM reports WHERE user_id = %s",
                (user["id"],),
            )
            row = cur.fetchone()
        return {**user, "report_count": row["total"] if row else 0}
    finally:
        conn.close()


def format_row(row: dict) -> dict:
    slug = row["category_slug"]
    created_at = row.get("created_at")
    return {
        "id": row["id"],
        "user_id": row["user_id"],
        "user_name": row.get("user_name"),
        "image_url": row["image_path"],
        "category": {"slug": slug, "label": LABEL_MAP.get(slug, slug)},
        "corrected_slug": row.get("corrected_slug"),
        "confidence": float(row["confidence"]),
        "needs_retake": bool(row["needs_retake"]),
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "ward": row.get("ward") or "Ward 12 - Morar",
        "remarks": row.get("remarks") or "",
        "status": row["status"],
        "created_at": created_at.isoformat()
        if hasattr(created_at, "isoformat")
        else created_at,
    }


@app.post("/api/reports", status_code=201)
async def create_report(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    remarks: str = Form(""),
    ward: str = Form("Ward 12 - Morar"),
    user: dict = Depends(get_current_user),
) -> dict:
    suffix = os.path.splitext(file.filename or "")[1] or ".img"
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="wb", suffix=suffix, dir=UPLOAD_DIR, delete=False
        ) as temp_file:
            temp_path = temp_file.name
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                temp_file.write(chunk)
        if os.path.getsize(temp_path) == 0:
            raise HTTPException(status_code=400, detail="Uploaded image is empty.")

        try:
            prediction = predict_waste(temp_path)
            with Image.open(temp_path) as source:
                thumbnail = source.convert("RGB")
            thumbnail.thumbnail((640, 640))
            image_buffer = io.BytesIO()
            thumbnail.save(image_buffer, format="JPEG", quality=75)
            data_uri = "data:image/jpeg;base64," + base64.b64encode(
                image_buffer.getvalue()
            ).decode("ascii")
        except UnidentifiedImageError as exc:
            raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.") from exc
    finally:
        await file.close()
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO reports "
                "(user_id, image_path, category_slug, confidence, needs_retake, "
                "latitude, longitude, ward, remarks, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'reported')",
                (
                    user["id"],
                    data_uri,
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
                "SELECT r.*, u.name AS user_name FROM reports r "
                "JOIN users u ON r.user_id = u.id WHERE r.id = %s",
                (report_id,),
            )
            row = cur.fetchone()
        conn.commit()
        return format_row(row)
    finally:
        conn.close()


@app.get("/api/reports")
def get_reports(user: dict = Depends(get_current_user)) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            query = (
                "SELECT r.*, u.name AS user_name FROM reports r "
                "JOIN users u ON r.user_id = u.id"
            )
            if user["role"] == "citizen":
                query += " WHERE r.user_id = %s ORDER BY r.id DESC"
                cur.execute(query, (user["id"],))
            else:
                query += " ORDER BY r.id DESC"
                cur.execute(query)
            rows = cur.fetchall()
        return [format_row(row) for row in rows]
    finally:
        conn.close()


@app.get("/api/reports/{report_id}")
def get_report(report_id: int, user: dict = Depends(get_current_user)) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT r.*, u.name AS user_name FROM reports r "
                "JOIN users u ON r.user_id = u.id WHERE r.id = %s",
                (report_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Report not found.")
        return format_row(row)
    finally:
        conn.close()


@app.patch("/api/reports/{report_id}")
def patch_report(
    report_id: int,
    payload: PatchReportSchema,
    user: dict = Depends(get_current_user),
) -> dict:
    updates = payload.dict(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="At least one field must be provided.")
    if "status" in updates and updates["status"] is not None:
        if updates["status"] not in VALID_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid report status.")
    if "corrected_slug" in updates and updates["corrected_slug"] is not None:
        if updates["corrected_slug"] not in VALID_SLUGS:
            raise HTTPException(status_code=400, detail="Invalid corrected category.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM reports WHERE id = %s", (report_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Report not found.")
            for field, value in updates.items():
                if value is not None:
                    cur.execute(
                        f"UPDATE reports SET {field} = %s WHERE id = %s",
                        (value, report_id),
                    )
            cur.execute(
                "SELECT r.*, u.name AS user_name FROM reports r "
                "JOIN users u ON r.user_id = u.id WHERE r.id = %s",
                (report_id,),
            )
            row = cur.fetchone()
        conn.commit()
        return format_row(row)
    finally:
        conn.close()


@app.delete("/api/reports/{report_id}")
def delete_report(report_id: int, user: dict = Depends(get_current_user)) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM reports WHERE id = %s", (report_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Report not found.")
        conn.commit()
        return {"deleted": True}
    finally:
        conn.close()


@app.get("/api/admin/users")
def list_users(user: dict = Depends(get_current_user)) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, email, role FROM users ORDER BY id ASC")
            return cur.fetchall()
    finally:
        conn.close()


@app.get("/api/admin/wards")
def list_wards(user: dict = Depends(get_current_user)) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM wards ORDER BY id ASC")
            return cur.fetchall()
    finally:
        conn.close()


@app.get("/api/admin/alerts")
def list_alerts(user: dict = Depends(get_current_user)) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM alerts ORDER BY id DESC")
            return cur.fetchall()
    finally:
        conn.close()
