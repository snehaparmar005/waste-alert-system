import base64
import gc
import hashlib
import hmac
import io
import os
import tempfile
from typing import Optional

import numpy as np
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
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
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions.")
        return user
    return checker


# ---------------------------------------------------------------------------
# Audit & notification helpers
# ---------------------------------------------------------------------------

def log_audit(user_id, user_name, action, entity=None, entity_id=None, details=None, ip=None):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, ip_address, details) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (user_id, user_name, action, entity, entity_id, ip, details),
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()


def create_notification(user_id, type, message, related_report_id=None):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO notifications (user_id, type, message, related_report_id) "
                "VALUES (%s, %s, %s, %s)",
                (user_id, type, message, related_report_id),
            )
        conn.commit()
    except Exception:
        pass
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
            cur.execute("ALTER TABLE reports MODIFY COLUMN image_path LONGTEXT")
            cur.execute(
                "ALTER TABLE users MODIFY COLUMN role "
                "VARCHAR(32) NOT NULL DEFAULT 'citizen'"
            )

            # Ensure new columns exist (safe for re-runs)
            alter_stmts = [
                "ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL",
                "ALTER TABLE users ADD COLUMN organisation VARCHAR(120) NULL",
                "ALTER TABLE users ADD COLUMN nagar_nigam_id INT NULL",
                "ALTER TABLE reports ADD COLUMN reference_id VARCHAR(20) UNIQUE",
                "ALTER TABLE reports ADD COLUMN assigned_worker_id INT NULL",
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

            # Ensure notifications table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    message TEXT NOT NULL,
                    is_read BOOLEAN DEFAULT FALSE,
                    related_report_id INT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            # Ensure audit_logs table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    user_name VARCHAR(120),
                    action VARCHAR(100) NOT NULL,
                    entity VARCHAR(100),
                    entity_id INT NULL,
                    ip_address VARCHAR(45),
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

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
    log_audit(user["id"], user["name"], "login", ip=request.client.host if request.client else None)
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
        "reference_id": row.get("reference_id"),
        "assigned_worker_id": row.get("assigned_worker_id"),
        "description": row.get("description", ""),
        "created_at": created_at.isoformat()
        if hasattr(created_at, "isoformat")
        else created_at,
    }


# ---------------------------------------------------------------------------
# Report endpoints
# ---------------------------------------------------------------------------

@app.post("/api/reports", status_code=201)
async def create_report(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    remarks: str = Form(""),
    ward: str = Form("Ward 12 - Morar"),
    description: str = Form(""),
    user: dict = Depends(get_current_user),
    request: Request = None,
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
                "SELECT r.*, u.name AS user_name FROM reports r "
                "JOIN users u ON r.user_id = u.id WHERE r.id = %s",
                (report_id,),
            )
            row = cur.fetchone()
        conn.commit()
        log_audit(
            user["id"], user["name"], "create_report", "report", report_id,
            details=f"ref={reference_id}",
            ip=request.client.host if request and request.client else None,
        )
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
            elif user["role"] == "worker":
                query += " WHERE r.assigned_worker_id = %s OR r.user_id = %s ORDER BY r.id DESC"
                cur.execute(query, (user["id"], user["id"]))
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
    request: Request = None,
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
            cur.execute(
                "SELECT r.*, u.name AS user_name FROM reports r "
                "JOIN users u ON r.user_id = u.id WHERE r.id = %s",
                (report_id,),
            )
            existing = cur.fetchone()
            if not existing:
                raise HTTPException(status_code=404, detail="Report not found.")

            # Citizens can only edit reports in 'submitted' status
            if user["role"] == "citizen" and existing["status"] != "submitted":
                raise HTTPException(
                    status_code=403,
                    detail="Cannot modify a report that is no longer in submitted status.",
                )

            new_status = updates.get("status")
            # When assigning, require assigned_worker_id
            if new_status == "assigned" and not updates.get("assigned_worker_id"):
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
                "SELECT r.*, u.name AS user_name FROM reports r "
                "JOIN users u ON r.user_id = u.id WHERE r.id = %s",
                (report_id,),
            )
            row = cur.fetchone()
        conn.commit()

        # Audit & notifications for status changes
        if new_status:
            log_audit(
                user["id"], user["name"], "change_status", "report", report_id,
                details=f"status={new_status}",
                ip=request.client.host if request and request.client else None,
            )
            # Notify report owner
            create_notification(
                existing["user_id"], "status_change",
                f"Your report #{report_id} status changed to {new_status}.",
                related_report_id=report_id,
            )
            # Notify assigned worker
            if new_status == "assigned" and updates.get("assigned_worker_id"):
                create_notification(
                    updates["assigned_worker_id"], "assignment",
                    f"You have been assigned to report #{report_id}.",
                    related_report_id=report_id,
                )

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


# ---------------------------------------------------------------------------
# Worker management endpoints
# ---------------------------------------------------------------------------

@app.get("/api/workers")
def list_workers(user: dict = Depends(require_role("gov", "admin", "worker"))) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if user["role"] == "gov":
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
            user["id"], user["name"], "create_worker", "user", worker_id,
            ip=request.client.host if request and request.client else None,
        )
        return worker
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
            user["id"], user["name"], "delete_worker", "user", worker_id,
            ip=request.client.host if request and request.client else None,
        )
        return {"deleted": True}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Notification endpoints
# ---------------------------------------------------------------------------

@app.get("/api/notifications")
def get_notifications(user: dict = Depends(get_current_user)) -> list:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC",
                (user["id"],),
            )
            rows = cur.fetchall()
            for row in rows:
                if hasattr(row.get("created_at"), "isoformat"):
                    row["created_at"] = row["created_at"].isoformat()
            return rows
    finally:
        conn.close()


@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, user: dict = Depends(get_current_user)) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s",
                (notification_id, user["id"]),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Notification not found.")
        conn.commit()
        return {"message": "Notification marked as read."}
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@app.get("/api/admin/users")
def list_users(user: dict = Depends(get_current_user)) -> list:
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
def admin_update_user(
    user_id: int,
    payload: dict,
    user: dict = Depends(require_role("admin")),
    request: Request = None,
) -> dict:
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="User not found.")
            if "role" in payload:
                valid_roles = {"citizen", "gov", "worker", "admin"}
                if payload["role"] not in valid_roles:
                    raise HTTPException(status_code=400, detail="Invalid role.")
                cur.execute(
                    "UPDATE users SET role = %s WHERE id = %s",
                    (payload["role"], user_id),
                )
            cur.execute(
                "SELECT id, name, email, role, phone, organisation, nagar_nigam_id FROM users WHERE id = %s",
                (user_id,),
            )
            updated = cur.fetchone()
        conn.commit()
        log_audit(
            user["id"], user["name"], "admin_update_user", "user", user_id,
            details=str(payload),
            ip=request.client.host if request and request.client else None,
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
            user["id"], user["name"], "admin_delete_user", "user", user_id,
            ip=request.client.host if request and request.client else None,
        )
        return {"deleted": True}
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
            query = "SELECT * FROM audit_logs WHERE 1=1"
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
            query += " ORDER BY created_at DESC"
            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            for row in rows:
                if hasattr(row.get("created_at"), "isoformat"):
                    row["created_at"] = row["created_at"].isoformat()
            return rows
    finally:
        conn.close()
