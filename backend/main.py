import base64
import gc
import hashlib
import hmac
import io
import math
import os
import tempfile
import threading
import time
import traceback
from copy import deepcopy
from typing import Optional

import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, Response, UploadFile
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
VALID_STATUSES = {"submitted", "assigned", "in_progress", "cleaned", "rejected"}
SECRET_KEY = os.getenv("SECRET_KEY", "click2clean-super-secret-key-2026")
_model = None
_response_cache = {}
_response_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 20


def get_cached_response(key):
    now = time.monotonic()
    with _response_cache_lock:
        cached = _response_cache.get(key)
        if cached and cached[0] > now:
            return deepcopy(cached[1])
        _response_cache.pop(key, None)
    return None


def set_cached_response(key, value):
    now = time.monotonic()
    with _response_cache_lock:
        expired_keys = [
            cached_key
            for cached_key, (expires_at, _) in _response_cache.items()
            if expires_at <= now
        ]
        for cached_key in expired_keys:
            _response_cache.pop(cached_key, None)
        if key not in _response_cache and len(_response_cache) >= 256:
            _response_cache.pop(next(iter(_response_cache)))
        _response_cache[key] = (now + CACHE_TTL_SECONDS, deepcopy(value))


def invalidate_response_cache(*prefixes):
    with _response_cache_lock:
        if not prefixes:
            _response_cache.clear()
            return
        for key in list(_response_cache):
            if any(key.startswith(prefix) for prefix in prefixes):
                _response_cache.pop(key, None)


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# ML prediction
# ---------------------------------------------------------------------------

def _fallback_waste_prediction(image_path: str) -> dict:
    with Image.open(image_path) as source:
        image = source.convert("RGB")

    try:
        image.thumbnail((64, 64))
        pixels = list(image.getdata())
    finally:
        image.close()

    if not pixels:
        raise ValueError("Uploaded image contains no pixels.")

    green_pixels = 0
    hazardous_pixels = 0
    synthetic_pixels = 0
    for red, green, blue in pixels:
        brightness = (red + green + blue) / 3
        saturation = (max(red, green, blue) - min(red, green, blue)) / max(
            max(red, green, blue), 1
        )

        if green > 45 and green >= red * 1.08 and green >= blue * 1.05:
            green_pixels += 1
        if (
            brightness < 65
            or (saturation < 0.12 and 65 <= brightness <= 185)
            or (blue > red * 1.12 and blue > green * 1.08 and saturation > 0.18)
        ):
            hazardous_pixels += 1
        if brightness >= 190 or (brightness >= 145 and saturation >= 0.28):
            synthetic_pixels += 1

    pixel_count = len(pixels)
    green_ratio = green_pixels / pixel_count
    hazardous_ratio = hazardous_pixels / pixel_count
    synthetic_ratio = synthetic_pixels / pixel_count

    if green_ratio >= 0.2:
        slug = "biodegradable"
    elif hazardous_ratio >= 0.2:
        slug = "hazardous"
    elif synthetic_ratio >= 0.2:
        slug = "non_biodegradable"
    else:
        slug = "non_biodegradable"

    return {
        "slug": slug,
        "label": LABEL_MAP[slug],
        "confidence": 0.78,
        "needs_retake": False,
    }


def _predict_with_model(image_path: str) -> dict:
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
        import tensorflow as tf

        _model = tf.keras.models.load_model(MODEL_PATH, compile=False)

    with Image.open(image_path) as source:
        image = source.convert("RGB").resize((224, 224))
    image_array = np.asarray(image, dtype=np.float32)
    predictions = _model.predict(np.expand_dims(image_array, axis=0), verbose=0)[0]
    index = int(np.argmax(predictions))
    confidence = round(float(predictions[index]), 4)
    return {
        "slug": CLASSES[index]["slug"],
        "label": CLASSES[index]["label"],
        "confidence": confidence,
        "needs_retake": confidence < 0.65,
    }


def predict_waste(image_path: str) -> dict:
    global _model
    try:
        return _predict_with_model(image_path)
    except Exception as e:
        print("ML inference fallback:", repr(e))
        _model = None
        gc.collect()
        return _fallback_waste_prediction(image_path)
    finally:
        gc.collect()


def _encode_report_image(image_path: str) -> str:
    with Image.open(image_path) as source:
        thumbnail = source.convert("RGB")

    try:
        thumbnail.thumbnail((480, 480))
        image_buffer = io.BytesIO()
        try:
            thumbnail.save(image_buffer, format="WEBP", quality=70)
            mime_type = "image/webp"
        except Exception as e:
            print("WebP encoding fallback:", repr(e))
            image_buffer = io.BytesIO()
            thumbnail.save(image_buffer, format="JPEG", quality=70)
            mime_type = "image/jpeg"

        encoded_image = base64.b64encode(image_buffer.getvalue()).decode("ascii")
        return f"data:{mime_type};base64,{encoded_image}"
    finally:
        thumbnail.close()


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Current-user dependency
# ---------------------------------------------------------------------------

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
                "SELECT id, name, email, role, phone, organisation, nagar_nigam_id FROM users WHERE id = %s",
                (user_id,),
            )
            user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="User not found.")
        return user
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Role guard helper
# ---------------------------------------------------------------------------

def require_role(*roles):
    def checker(user: dict = Depends(get_current_user)):
        if str(user.get("role", "")).lower() not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions.")
        return user
    return checker


# ---------------------------------------------------------------------------
# Audit & notification helpers
# ---------------------------------------------------------------------------

def log_audit(
    user_id,
    user_name,
    action,
    entity=None,
    entity_id=None,
    details=None,
    ip=None,
    user_role=None,
):
    detail_text = details or ""
    if entity_id is not None:
        detail_text = f"entity_id={entity_id}" + (
            f"; {detail_text}" if detail_text else ""
        )
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO audit_logs "
                "(user_id, user_name, user_role, action, entity, ip_address, details) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (user_id, user_name, user_role, action, entity, ip, detail_text or None),
            )
        conn.commit()
    finally:
        conn.close()


def create_notification(title, message, user_id=None, target_role=None):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO notifications (user_id, target_role, title, message) "
                "VALUES (%s, %s, %s, %s)",
                (user_id, target_role, title, message),
            )
        conn.commit()
        invalidate_response_cache("notifications:")
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

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
    assigned_worker_id: Optional[int] = None
    description: Optional[str] = None
    remarks: Optional[str] = None
    ward: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class ProfileUpdateSchema(BaseModel):
    name: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    confirm_password: Optional[str] = None
    phone: Optional[str] = None
    organisation: Optional[str] = None


class PasswordChangeSchema(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class WorkerCreateSchema(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    organisation: Optional[str] = None


class WorkerUpdateSchema(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    organisation: Optional[str] = None


class AdminUserUpdateSchema(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


# ---------------------------------------------------------------------------
# Startup: seed users + ensure tables/columns
# ---------------------------------------------------------------------------

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
            try:
                cur.execute("ALTER TABLE reports MODIFY COLUMN image_path LONGTEXT")
            except Exception:
                pass

            try:
                cur.execute("ALTER TABLE reports ADD COLUMN assigned_worker_id INT NULL")
            except Exception:
                pass

            try:
                cur.execute(
                    "ALTER TABLE users MODIFY COLUMN role "
                    "VARCHAR(32) NOT NULL DEFAULT 'citizen'"
                )
            except Exception:
                pass

            # Ensure new columns exist (safe for re-runs)
            alter_stmts = [
                "ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL",
                "ALTER TABLE users ADD COLUMN organisation VARCHAR(120) NULL",
                "ALTER TABLE users ADD COLUMN nagar_nigam_id INT NULL",
                "ALTER TABLE reports ADD COLUMN reference_id VARCHAR(20) UNIQUE",
                "ALTER TABLE reports ADD COLUMN description TEXT",
            ]
            for stmt in alter_stmts:
                try:
                    cur.execute(stmt)
                except Exception:
                    pass  # column already exists

            # Ensure status column supports new values
            try:
                cur.execute(
                    "ALTER TABLE reports MODIFY COLUMN status "
                    "VARCHAR(32) NOT NULL DEFAULT 'submitted'"
                )
            except Exception:
                pass
            for index_name, column_name in (
                ("idx_reports_user_id", "user_id"),
                ("idx_reports_status", "status"),
                ("idx_reports_assigned_worker_id", "assigned_worker_id"),
            ):
                try:
                    cur.execute(
                        f"CREATE INDEX {index_name} ON reports ({column_name})"
                    )
                except Exception:
                    pass

            # Ensure notifications table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NULL,
                    target_role VARCHAR(32) NULL,
                    title VARCHAR(160),
                    message TEXT,
                    is_read TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("SHOW COLUMNS FROM notifications")
            notification_columns = {
                column["Field"]: column for column in cur.fetchall()
            }
            if "target_role" not in notification_columns:
                try:
                    cur.execute(
                        "ALTER TABLE notifications ADD COLUMN target_role VARCHAR(32) NULL"
                    )
                except Exception:
                    pass
            if "title" not in notification_columns:
                try:
                    cur.execute(
                        "ALTER TABLE notifications ADD COLUMN title VARCHAR(160) NULL"
                    )
                except Exception:
                    pass
            if (
                "user_id" in notification_columns
                and notification_columns["user_id"]["Null"] == "NO"
            ):
                try:
                    cur.execute(
                        "ALTER TABLE notifications MODIFY COLUMN user_id INT NULL"
                    )
                except Exception:
                    pass
            if (
                "type" in notification_columns
                and notification_columns["type"]["Null"] == "NO"
            ):
                try:
                    cur.execute(
                        "ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) NULL"
                    )
                except Exception:
                    pass

            # Ensure audit_logs table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT,
                    user_name VARCHAR(120),
                    user_role VARCHAR(32),
                    action VARCHAR(120),
                    entity VARCHAR(120),
                    details TEXT,
                    ip_address VARCHAR(64),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            audit_log_alter_stmts = [
                "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_role VARCHAR(32) NULL",
                "ALTER TABLE audit_logs ADD COLUMN user_role VARCHAR(32) NULL",
                "ALTER TABLE audit_logs MODIFY COLUMN action VARCHAR(120)",
                "ALTER TABLE audit_logs MODIFY COLUMN entity VARCHAR(120)",
                "ALTER TABLE audit_logs MODIFY COLUMN ip_address VARCHAR(64)",
            ]
            for stmt in audit_log_alter_stmts:
                try:
                    cur.execute(stmt)
                except Exception:
                    pass

            for name, email, role in demo_users:
                cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                if cur.fetchone() is None:
                    cur.execute(
                        "INSERT INTO users (name, email, password_hash, role) "
                        "VALUES (%s, %s, %s, %s)",
                        (name, email, hash_pw("password123"), role),
                    )

            # Link demo worker to demo NN officer
            cur.execute("SELECT id FROM users WHERE email = %s", ("officer@nagarnigam.gov.in",))
            officer = cur.fetchone()
            if officer:
                cur.execute(
                    "UPDATE users SET nagar_nigam_id = %s WHERE email = %s",
                    (officer["id"], "worker@nagarnigam.gov.in"),
                )

        conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def on_startup() -> None:
    seed_users()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
def root_health() -> dict:
    return {"status": "ok", "service": "Click-2-Clean API"}


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

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
def login(payload: LoginSchema, request: Request) -> dict:
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
    log_audit(
        user["id"],
        user["name"],
        "login",
        ip=request.client.host if request.client else None,
        user_role=user["role"],
    )
    return {"token": create_token(user["id"]), "user": public_user, **public_user}


@app.post("/api/logout")
def logout() -> dict:
    return {"message": "Logged out"}


# ---------------------------------------------------------------------------
# Profile endpoints
# ---------------------------------------------------------------------------

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
        return {
            **user,
            "phone": user.get("phone"),
            "organisation": user.get("organisation"),
            "role": user["role"],
            "report_count": row["total"] if row else 0,
        }
    finally:
        conn.close()


@app.put("/api/profile")
@app.patch("/api/profile")
def update_profile(
    payload: ProfileUpdateSchema,
    user: dict = Depends(get_current_user),
) -> dict:
    name = None
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty.")

    current_password = payload.current_password
    new_password = payload.new_password
    confirm_password = payload.confirm_password
    password_update = new_password is not None
    if new_password is not None:
        if not current_password:
            raise HTTPException(
                status_code=400,
                detail="Current password is required to change your password.",
            )
        if not confirm_password:
            raise HTTPException(
                status_code=400,
                detail="Password confirmation is required.",
            )
        if new_password != confirm_password:
            raise HTTPException(
                status_code=400,
                detail="New password and confirmation do not match.",
            )
        if len(new_password) < 6:
            raise HTTPException(
                status_code=400,
                detail="New password must be at least 6 characters.",
            )

    if (
        name is None
        and not password_update
        and payload.phone is None
        and payload.organisation is None
    ):
        raise HTTPException(status_code=400, detail="No fields to update.")

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if new_password is not None:
                cur.execute(
                    "SELECT password_hash FROM users WHERE id = %s",
                    (user["id"],),
                )
                password_row = cur.fetchone()
                if not password_row or not verify_pw(
                    current_password, password_row["password_hash"]
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Current password is incorrect.",
                    )

            updates = []
            values = []
            if name is not None:
                updates.append("name = %s")
                values.append(name)
            if payload.phone is not None:
                updates.append("phone = %s")
                values.append(payload.phone.strip())
            if payload.organisation is not None:
                updates.append("organisation = %s")
                values.append(payload.organisation.strip())
            if new_password is not None:
                updates.append("password_hash = %s")
                values.append(hash_pw(new_password))

            values.append(user["id"])
            cur.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = %s",
                tuple(values),
            )
            cur.execute(
                "SELECT id, name, email, role FROM users WHERE id = %s",
                (user["id"],),
            )
            updated = cur.fetchone()
        conn.commit()
        if not updated:
            raise HTTPException(status_code=404, detail="User not found.")
        return updated
    finally:
        conn.close()


@app.put("/api/profile/password")
def change_password(payload: PasswordChangeSchema, user: dict = Depends(get_current_user)) -> dict:
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match.")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT password_hash FROM users WHERE id = %s", (user["id"],))
            row = cur.fetchone()
            if not row or not verify_pw(payload.current_password, row["password_hash"]):
                raise HTTPException(status_code=400, detail="Current password is incorrect.")
            cur.execute(
                "UPDATE users SET password_hash = %s WHERE id = %s",
                (hash_pw(payload.new_password), user["id"]),
            )
        conn.commit()
        return {"message": "Password updated successfully."}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Report helpers
# ---------------------------------------------------------------------------

def format_row(row: dict, include_image: bool = True) -> dict:
    slug = row["category_slug"]
    created_at = row.get("created_at")
    status = row["status"]
    if str(status).lower() == "reported":
        status = "submitted"
    formatted = {
        "id": row["id"],
        "user_id": row["user_id"],
        "user_name": row.get("user_name"),
        "category": {"slug": slug, "label": LABEL_MAP.get(slug, slug)},
        "category_slug": slug,
        "corrected_slug": row.get("corrected_slug"),
        "confidence": float(row["confidence"]),
        "needs_retake": bool(row["needs_retake"]),
        "latitude": float(row["latitude"]),
        "longitude": float(row["longitude"]),
        "ward": row.get("ward") or "Ward 12 - Morar",
        "remarks": row.get("remarks") or "",
        "status": status,
        "reference_id": f"C2C-{int(row['id']):03d}",
        "assigned_worker_id": row.get("assigned_worker_id"),
        "assigned_worker_name": row.get("assigned_worker_name"),
        "description": row.get("description", ""),
        "created_at": created_at.isoformat()
        if hasattr(created_at, "isoformat")
        else created_at,
    }
    if include_image and "image_path" in row:
        formatted["image_url"] = row["image_path"]
    return formatted


# ---------------------------------------------------------------------------
# Report endpoints
# ---------------------------------------------------------------------------

@app.post("/api/reports", status_code=201)
async def create_report(
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    remarks: str = Form(""),
    ward: str = Form("Ward 12 - Morar"),
    description: str = Form(""),
    user: dict = Depends(get_current_user),
    request: Request = None,
) -> dict:
    try:
        suffix = os.path.splitext(file.filename or "")[1] or ".img"
        temp_path = None
        try:
            if latitude is None or longitude is None:
                raise HTTPException(
                    status_code=400,
                    detail="Latitude and longitude are required to submit a report.",
                )
            if (
                not math.isfinite(latitude)
                or not math.isfinite(longitude)
                or not -90 <= latitude <= 90
                or not -180 <= longitude <= 180
            ):
                raise HTTPException(status_code=400, detail="A valid GPS location is required.")
            if latitude == 0 and longitude == 0:
                raise HTTPException(
                    status_code=400,
                    detail="The GPS location cannot be (0, 0). Detect or select a valid location.",
                )

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
                data_uri = _encode_report_image(temp_path)
            except UnidentifiedImageError as exc:
                raise HTTPException(
                    status_code=400,
                    detail="Uploaded file is not a valid image.",
                ) from exc
        finally:
            try:
                await file.close()
            finally:
                if temp_path and os.path.exists(temp_path):
                    os.remove(temp_path)

        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO reports "
                    "(user_id, image_path, category_slug, confidence, needs_retake, "
                    "latitude, longitude, ward, remarks, description, status) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'submitted')",
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
                        description,
                    ),
                )
                report_id = cur.lastrowid

                # Generate reference_id
                reference_id = f"C2C-{report_id:03d}"
                cur.execute(
                    "UPDATE reports SET reference_id = %s WHERE id = %s",
                    (reference_id, report_id),
                )

                cur.execute(
                    "SELECT r.id, r.user_id, u.name AS user_name, r.category_slug, "
                    "r.corrected_slug, r.confidence, r.needs_retake, r.latitude, "
                    "r.longitude, r.ward, r.remarks, r.description, r.status, "
                    "r.reference_id, r.assigned_worker_id, r.created_at, "
                    "w.name AS assigned_worker_name "
                    "FROM reports r JOIN users u ON r.user_id = u.id "
                    "LEFT JOIN users w ON r.assigned_worker_id = w.id WHERE r.id = %s",
                    (report_id,),
                )
                row = cur.fetchone()
            conn.commit()
            invalidate_response_cache("reports:")
            log_audit(
                user["id"], user["name"], "report_created", "report", report_id,
                details=f"ref={reference_id}",
                ip=request.client.host if request and request.client else None,
                user_role=user["role"],
            )
            report_ward = ward or "Ward not specified"
            for target_role in ("gov", "admin"):
                create_notification(
                    title=f"New waste report: {reference_id}",
                    message=f"{reference_id} was submitted for {report_ward}.",
                    target_role=target_role,
                )
            return format_row(row, include_image=False)
        finally:
            conn.close()
    except HTTPException:
        raise
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Report error: {type(e).__name__}: {e}",
        ) from e


@app.get("/api/reports")
def get_reports(
    response: Response,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    assigned_only: bool = Query(False),
    legacy: bool = Query(False),
    user: dict = Depends(get_current_user),
):
    response.headers["Cache-Control"] = "private, max-age=15"
    cache_key = (
        f"reports:{user['id']}:{user['role']}:{page}:{limit}:"
        f"{status or ''}:{category or ''}:{int(assigned_only)}:{int(legacy)}"
    )
    cached = get_cached_response(cache_key)
    if cached is not None:
        return cached

    scope_clauses = []
    scope_params = []
    if user["role"] == "citizen":
        scope_clauses.append("r.user_id = %s")
        scope_params.append(user["id"])
    elif user["role"] == "worker":
        if assigned_only:
            scope_clauses.append("r.assigned_worker_id = %s")
            scope_params.append(user["id"])
        else:
            scope_clauses.append("(r.assigned_worker_id = %s OR r.user_id = %s)")
            scope_params.extend((user["id"], user["id"]))
    scope_sql = f" WHERE {' AND '.join(scope_clauses)}" if scope_clauses else ""

    filters = list(scope_clauses)
    filter_params = list(scope_params)
    if status:
        if status == "submitted":
            filters.append("r.status IN ('submitted', 'reported')")
        else:
            filters.append("r.status = %s")
            filter_params.append(status)
    if category:
        filters.append("COALESCE(r.corrected_slug, r.category_slug) = %s")
        filter_params.append(category)
    filter_sql = f" WHERE {' AND '.join(filters)}" if filters else ""

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS total, "
                "SUM(CASE WHEN r.status IN ('submitted', 'reported') THEN 1 ELSE 0 END) AS submitted, "
                "SUM(CASE WHEN r.status = 'assigned' THEN 1 ELSE 0 END) AS assigned, "
                "SUM(CASE WHEN r.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress, "
                "SUM(CASE WHEN r.status = 'cleaned' THEN 1 ELSE 0 END) AS cleaned, "
                "SUM(CASE WHEN r.status = 'rejected' THEN 1 ELSE 0 END) AS rejected "
                f"FROM reports r{scope_sql}",
                tuple(scope_params),
            )
            summary_row = cur.fetchone()
            cur.execute(
                "SELECT COALESCE(r.corrected_slug, r.category_slug) AS category_slug, "
                f"COUNT(*) AS count FROM reports r{scope_sql} "
                "GROUP BY COALESCE(r.corrected_slug, r.category_slug)",
                tuple(scope_params),
            )
            categories = {
                row["category_slug"] or "other": int(row["count"])
                for row in cur.fetchall()
            }
            cur.execute(
                f"SELECT COUNT(*) AS total FROM reports r{filter_sql}",
                tuple(filter_params),
            )
            total = int(cur.fetchone()["total"])

            list_query = (
                "SELECT r.id, r.reference_id, r.user_id, u.name AS user_name, "
                "r.category_slug, r.corrected_slug, r.confidence, r.needs_retake, "
                "r.latitude, r.longitude, r.ward, r.remarks, r.description, "
                "r.status, r.assigned_worker_id, w.name AS assigned_worker_name, "
                "r.created_at "
                "FROM reports r JOIN users u ON r.user_id = u.id "
                "LEFT JOIN users w ON r.assigned_worker_id = w.id"
                f"{filter_sql} ORDER BY r.id DESC LIMIT %s OFFSET %s"
            )
            cur.execute(
                list_query,
                tuple(filter_params) + (limit, (page - 1) * limit),
            )
            rows = cur.fetchall()
        items = [format_row(row) for row in rows]
        if legacy:
            result = items
        else:
            result = {
                "items": items,
                "total": total,
                "page": page,
                "total_pages": math.ceil(total / limit),
                "summary": {
                    "total": int(summary_row["total"] or 0),
                    "submitted": int(summary_row["submitted"] or 0),
                    "assigned": int(summary_row["assigned"] or 0),
                    "in_progress": int(summary_row["in_progress"] or 0),
                    "cleaned": int(summary_row["cleaned"] or 0),
                    "rejected": int(summary_row["rejected"] or 0),
                    "categories": categories,
                },
            }
        set_cached_response(cache_key, result)
        return result
    finally:
        conn.close()


@app.get("/api/reports/{report_id}")
def get_report(report_id: int, user: dict = Depends(get_current_user)) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT r.*, u.name AS user_name, w.name AS assigned_worker_name "
                "FROM reports r JOIN users u ON r.user_id = u.id "
                "LEFT JOIN users w ON r.assigned_worker_id = w.id WHERE r.id = %s",
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
    request: Request = None,
) -> dict:
    updates = payload.dict(exclude_unset=True)
    role = str(user.get("role", "")).lower()
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
            cur.execute(
                "SELECT r.id, r.user_id, u.name AS user_name, r.category_slug, "
                "r.corrected_slug, r.confidence, r.needs_retake, r.latitude, "
                "r.longitude, r.ward, r.remarks, r.description, r.status, "
                "r.reference_id, r.assigned_worker_id, r.created_at, "
                "w.name AS assigned_worker_name "
                "FROM reports r JOIN users u ON r.user_id = u.id "
                "LEFT JOIN users w ON r.assigned_worker_id = w.id WHERE r.id = %s",
                (report_id,),
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Report not found.")

            if role == "citizen":
                citizen_editable_fields = {
                    "remarks",
                    "ward",
                    "latitude",
                    "longitude",
                    "corrected_slug",
                    "description",
                }
                if existing["user_id"] != user["id"]:
                    raise HTTPException(status_code=403, detail="You cannot edit this report.")
                existing_status = str(existing["status"]).lower()
                if existing_status == "reported":
                    existing_status = "submitted"
                if existing_status != "submitted":
                    raise HTTPException(
                        status_code=403,
                        detail="Reports can only be edited while their status is submitted.",
                    )
                if set(updates) - citizen_editable_fields:
                    raise HTTPException(
                        status_code=403,
                        detail="Citizens may only edit report details while submitted.",
                    )
            elif role == "worker":
                if set(updates) - {"status"}:
                    raise HTTPException(
                        status_code=403,
                        detail="Workers may only update report status.",
                    )
            elif role not in ("gov", "officer", "admin"):
                raise HTTPException(status_code=403, detail="Insufficient permissions.")

            if "latitude" in updates or "longitude" in updates:
                latitude = updates.get("latitude")
                longitude = updates.get("longitude")
                if latitude is None or longitude is None:
                    raise HTTPException(
                        status_code=400,
                        detail="Latitude and longitude must be provided together.",
                    )
                if (
                    not math.isfinite(latitude)
                    or not math.isfinite(longitude)
                    or not -90 <= latitude <= 90
                    or not -180 <= longitude <= 180
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="A valid GPS location is required.",
                    )
                if latitude == 0 and longitude == 0:
                    raise HTTPException(
                        status_code=400,
                        detail="The GPS location cannot be (0, 0).",
                    )

            assigned_worker_id = updates.get("assigned_worker_id")
            if assigned_worker_id is not None:
                if role not in ("gov", "officer", "admin"):
                    raise HTTPException(
                        status_code=403,
                        detail="Only officers and administrators can assign workers.",
                    )
                cur.execute(
                    "SELECT id, nagar_nigam_id FROM users "
                    "WHERE id = %s AND role = 'worker'",
                    (assigned_worker_id,),
                )
                worker = cur.fetchone()
                if not worker:
                    raise HTTPException(status_code=400, detail="Selected worker was not found.")
                if (
                    role == "gov"
                    and worker["nagar_nigam_id"] != user["id"]
                ):
                    raise HTTPException(
                        status_code=403,
                        detail="You can only assign workers under your Nagar Nigam.",
                    )
                updates["status"] = "assigned"

            new_status = updates.get("status")
            # When assigning, require assigned_worker_id
            if new_status == "assigned" and not updates.get(
                "assigned_worker_id", existing.get("assigned_worker_id")
            ):
                raise HTTPException(
                    status_code=400,
                    detail="assigned_worker_id is required when setting status to 'assigned'.",
                )

            for field, value in updates.items():
                if value is not None:
                    cur.execute(
                        f"UPDATE reports SET {field} = %s WHERE id = %s",
                        (value, report_id),
                    )
            cur.execute(
                "SELECT r.id, r.user_id, u.name AS user_name, r.category_slug, "
                "r.corrected_slug, r.confidence, r.needs_retake, r.latitude, "
                "r.longitude, r.ward, r.remarks, r.description, r.status, "
                "r.reference_id, r.assigned_worker_id, r.created_at, "
                "w.name AS assigned_worker_name "
                "FROM reports r JOIN users u ON r.user_id = u.id "
                "LEFT JOIN users w ON r.assigned_worker_id = w.id WHERE r.id = %s",
                (report_id,),
            )
            row = cur.fetchone()
        conn.commit()
        invalidate_response_cache("reports:", "notifications:")

        existing_status = str(existing.get("status") or "").lower()
        if existing_status == "reported":
            existing_status = "submitted"
        assigned_worker_id = updates.get(
            "assigned_worker_id", existing.get("assigned_worker_id")
        )
        assignment_changed = (
            "assigned_worker_id" in updates
            and str(updates["assigned_worker_id"])
            != str(existing.get("assigned_worker_id") or "")
        )
        status_changed = new_status is not None and new_status != existing_status

        # Audit every report mutation and notify recipients for state changes.
        if updates:
            if new_status == "cleaned":
                audit_action = "report_cleaned"
            elif new_status == "assigned":
                audit_action = "report_assigned"
            else:
                audit_action = "report_updated"
            log_audit(
                user["id"], user["name"], audit_action, "report", report_id,
                details=", ".join(f"{field}={value}" for field, value in updates.items()),
                ip=request.client.host if request and request.client else None,
                user_role=user["role"],
            )
        if new_status and (status_changed or assignment_changed):
            reference_id = existing.get("reference_id") or f"C2C-{report_id:03d}"
            status_label = new_status.replace("_", " ").title()
            create_notification(
                title=f"{reference_id} status updated",
                message=f"Your report {reference_id} is now {status_label}.",
                user_id=existing["user_id"],
            )
            if assigned_worker_id:
                create_notification(
                    title=f"{reference_id} task updated",
                    message=f"Report {reference_id} is now {status_label}.",
                    user_id=assigned_worker_id,
                )

        return format_row(row, include_image=False)
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
        invalidate_response_cache("reports:", "notifications:")
        return {"deleted": True}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Worker management endpoints
# ---------------------------------------------------------------------------

@app.get("/api/workers")
def list_workers(user: dict = Depends(require_role("gov", "officer", "admin"))) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if str(user.get("role", "")).lower() == "gov":
                cur.execute(
                    "SELECT id, name, email, role, phone, organisation, nagar_nigam_id "
                    "FROM users WHERE role = 'worker' AND nagar_nigam_id = %s ORDER BY id ASC",
                    (user["id"],),
                )
            else:
                cur.execute(
                    "SELECT id, name, email, role, phone, organisation, nagar_nigam_id "
                    "FROM users WHERE role = 'worker' ORDER BY id ASC"
                )
            return cur.fetchall()
    finally:
        conn.close()


@app.post("/api/workers", status_code=201)
def create_worker(
    payload: WorkerCreateSchema,
    user: dict = Depends(require_role("gov", "admin")),
    request: Request = None,
) -> dict:
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
                "INSERT INTO users (name, email, password_hash, role, phone, organisation, nagar_nigam_id) "
                "VALUES (%s, %s, %s, 'worker', %s, %s, %s)",
                (name, email, hash_pw(payload.password), payload.phone, payload.organisation, user["id"]),
            )
            worker_id = cur.lastrowid
            cur.execute(
                "SELECT id, name, email, role, phone, organisation, nagar_nigam_id "
                "FROM users WHERE id = %s",
                (worker_id,),
            )
            worker = cur.fetchone()
        conn.commit()
        log_audit(
            user["id"], user["name"], "worker_created", "user", worker_id,
            ip=request.client.host if request and request.client else None,
            user_role=user["role"],
        )
        return worker
    finally:
        conn.close()


@app.put("/api/workers/{worker_id}")
def update_worker(
    worker_id: int,
    payload: WorkerUpdateSchema,
    user: dict = Depends(require_role("gov", "admin")),
    request: Request = None,
) -> dict:
    provided = payload.dict(exclude_unset=True)
    if not provided:
        raise HTTPException(status_code=400, detail="At least one field must be provided.")

    updates = {}
    if "name" in provided:
        name = (provided["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Worker name cannot be empty.")
        updates["name"] = name
    if "email" in provided:
        email = (provided["email"] or "").strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail="Worker email cannot be empty.")
        updates["email"] = email
    for field in ("phone", "organisation"):
        if field in provided:
            value = provided[field]
            updates[field] = value.strip() if value else None

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, nagar_nigam_id FROM users WHERE id = %s AND role = 'worker'",
                (worker_id,),
            )
            worker = cur.fetchone()
            if not worker:
                raise HTTPException(status_code=404, detail="Worker not found.")
            if (
                user["role"] == "gov"
                and worker["nagar_nigam_id"] != user["id"]
            ):
                raise HTTPException(
                    status_code=403,
                    detail="You can only manage your own workers.",
                )
            if "email" in updates:
                cur.execute(
                    "SELECT id FROM users WHERE email = %s AND id <> %s",
                    (updates["email"], worker_id),
                )
                if cur.fetchone():
                    raise HTTPException(
                        status_code=409,
                        detail="Email is already registered.",
                    )

            columns = ", ".join(f"{field} = %s" for field in updates)
            cur.execute(
                f"UPDATE users SET {columns} WHERE id = %s",
                (*updates.values(), worker_id),
            )
            cur.execute(
                "SELECT id, name, email, role, phone, organisation, nagar_nigam_id "
                "FROM users WHERE id = %s",
                (worker_id,),
            )
            updated_worker = cur.fetchone()
        conn.commit()
        log_audit(
            user["id"], user["name"], "worker_updated", "user", worker_id,
            details=", ".join(f"{field}={value}" for field, value in updates.items()),
            ip=request.client.host if request and request.client else None,
            user_role=user["role"],
        )
        return updated_worker
    finally:
        conn.close()


@app.delete("/api/workers/{worker_id}")
def delete_worker(
    worker_id: int,
    user: dict = Depends(require_role("gov", "admin")),
    request: Request = None,
) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, nagar_nigam_id FROM users WHERE id = %s AND role = 'worker'", (worker_id,))
            worker = cur.fetchone()
            if not worker:
                raise HTTPException(status_code=404, detail="Worker not found.")
            # Gov officers can only delete their own workers
            if user["role"] == "gov" and worker["nagar_nigam_id"] != user["id"]:
                raise HTTPException(status_code=403, detail="You can only manage your own workers.")
            cur.execute("DELETE FROM users WHERE id = %s", (worker_id,))
        conn.commit()
        log_audit(
            user["id"], user["name"], "worker_deleted", "user", worker_id,
            ip=request.client.host if request and request.client else None,
            user_role=user["role"],
        )
        return {"deleted": True}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Notification endpoints
# ---------------------------------------------------------------------------

@app.get("/api/notifications")
def get_notifications(
    response: Response,
    user: dict = Depends(get_current_user),
) -> dict:
    response.headers["Cache-Control"] = "private, max-age=15"
    cache_key = f"notifications:{user['id']}:{user['role']}"
    cached = get_cached_response(cache_key)
    if cached is not None:
        return cached
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, user_id, target_role, title, message, is_read, created_at "
                "FROM notifications WHERE user_id = %s OR target_role = %s "
                "ORDER BY id DESC LIMIT 20",
                (user["id"], user["role"]),
            )
            rows = cur.fetchall()
            cur.execute(
                "SELECT COUNT(*) AS unread_count FROM notifications "
                "WHERE (user_id = %s OR target_role = %s) AND is_read = 0",
                (user["id"], user["role"]),
            )
            unread_row = cur.fetchone()
            for row in rows:
                row["title"] = row.get("title") or "Notification"
                row["message"] = row.get("message") or ""
                row["is_read"] = bool(row.get("is_read"))
                if hasattr(row.get("created_at"), "isoformat"):
                    row["created_at"] = row["created_at"].isoformat()
            result = {
                "notifications": rows,
                "unread_count": int(unread_row["unread_count"]),
            }
            set_cached_response(cache_key, result)
            return result
    finally:
        conn.close()


@app.patch("/api/notifications/read-all")
def mark_all_notifications_read(user: dict = Depends(get_current_user)) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE notifications SET is_read = 1 "
                "WHERE (user_id = %s OR target_role = %s) AND is_read = 0",
                (user["id"], user["role"]),
            )
            marked_count = cur.rowcount
        conn.commit()
        invalidate_response_cache("notifications:")
        return {"marked_count": marked_count, "unread_count": 0}
    finally:
        conn.close()


@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, user: dict = Depends(get_current_user)) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE notifications SET is_read = 1 "
                "WHERE id = %s AND (user_id = %s OR target_role = %s)",
                (notification_id, user["id"], user["role"]),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Notification not found.")
        conn.commit()
        invalidate_response_cache("notifications:")
        return {"message": "Notification marked as read."}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@app.get("/api/admin/users")
def list_users(user: dict = Depends(require_role("admin"))) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, email, role, phone, organisation, nagar_nigam_id FROM users ORDER BY id ASC"
            )
            return cur.fetchall()
    finally:
        conn.close()


@app.patch("/api/admin/users/{user_id}")
@app.put("/api/admin/users/{user_id}")
def admin_update_user(
    user_id: int,
    payload: AdminUserUpdateSchema,
    user: dict = Depends(require_role("admin")),
    request: Request = None,
) -> dict:
    provided = payload.dict(exclude_unset=True)
    if not provided:
        raise HTTPException(status_code=400, detail="At least one field must be provided.")

    updates = {}
    if "name" in provided:
        name = (provided["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty.")
        updates["name"] = name
    if "email" in provided:
        email = (provided["email"] or "").strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail="Email cannot be empty.")
        updates["email"] = email
    if "role" in provided:
        valid_roles = {"citizen", "gov", "worker", "admin"}
        if provided["role"] not in valid_roles:
            raise HTTPException(status_code=400, detail="Invalid role.")
        updates["role"] = provided["role"]

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found.")
            if "email" in updates:
                cur.execute(
                    "SELECT id FROM users WHERE email = %s AND id <> %s",
                    (updates["email"], user_id),
                )
                if cur.fetchone():
                    raise HTTPException(status_code=409, detail="Email is already registered.")
            columns = ", ".join(f"{field} = %s" for field in updates)
            cur.execute(
                f"UPDATE users SET {columns} WHERE id = %s",
                (*updates.values(), user_id),
            )
            cur.execute(
                "SELECT id, name, email, role, phone, organisation, nagar_nigam_id FROM users WHERE id = %s",
                (user_id,),
            )
            updated = cur.fetchone()
        conn.commit()
        log_audit(
            user["id"], user["name"], "user_updated", "user", user_id,
            details=", ".join(f"{field}={value}" for field, value in updates.items()),
            ip=request.client.host if request and request.client else None,
            user_role=user["role"],
        )
        return updated
    finally:
        conn.close()


@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(
    user_id: int,
    user: dict = Depends(require_role("admin")),
    request: Request = None,
) -> dict:
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="User not found.")
        conn.commit()
        log_audit(
            user["id"], user["name"], "user_deleted", "user", user_id,
            ip=request.client.host if request and request.client else None,
            user_role=user["role"],
        )
        return {"deleted": True}
    finally:
        conn.close()


@app.get("/api/admin/wards")
def list_wards(user: dict = Depends(require_role("admin"))) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM wards ORDER BY id ASC")
            return cur.fetchall()
    finally:
        conn.close()


@app.get("/api/admin/alerts")
def list_alerts(user: dict = Depends(require_role("admin"))) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM alerts ORDER BY id DESC")
            return cur.fetchall()
    finally:
        conn.close()


@app.get("/api/admin/audit-logs")
def get_audit_logs(
    user: dict = Depends(require_role("admin")),
    action: Optional[str] = Query(None),
    user_id_filter: Optional[int] = Query(None, alias="user_id"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            query = (
                "SELECT id, user_id, user_name, user_role, action, entity, "
                "ip_address, details, created_at FROM audit_logs WHERE 1=1"
            )
            params = []
            if action:
                query += " AND action = %s"
                params.append(action)
            if user_id_filter:
                query += " AND user_id = %s"
                params.append(user_id_filter)
            if date_from:
                query += " AND created_at >= %s"
                params.append(date_from)
            if date_to:
                query += " AND created_at <= %s"
                params.append(date_to)
            query += " ORDER BY id DESC"
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            for row in rows:
                if hasattr(row.get("created_at"), "isoformat"):
                    row["created_at"] = row["created_at"].isoformat()
            return rows
    finally:
        conn.close()
