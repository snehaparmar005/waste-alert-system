import os
import io
import gc
import uuid
import base64
import secrets
import hashlib
import hmac
import numpy as np
from PIL import Image
from typing import Optional
from fastapi import FastAPI, HTTPException, Depends, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
LABEL_MAP = {c["slug"]: c["label"] for c in CLASSES}
SECRET_KEY = os.getenv("SECRET_KEY", "click2clean-super-secret-key-2026")
_model = None


def create_token(user_id: int) -> str:
    payload = str(user_id)
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()


def verify_token(token: str) -> Optional[int]:
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        uid_str, sig = decoded.split(":", 1)
        expected = hmac.new(SECRET_KEY.encode(), uid_str.encode(), hashlib.sha256).hexdigest()
        return int(uid_str) if hmac.compare_digest(sig, expected) else None
    except Exception:
        return None


def predict_waste(image_path: str) -> dict:
    global _model
    if _model is None:
        import tensorflow as tf
        _model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    img = Image.open(image_path).convert("RGB").resize((224, 224))
    arr = np.asarray(img, dtype=np.float32)
    preds = _model.predict(np.expand_dims(arr, axis=0), verbose=0)
    idx = int(np.argmax(preds))
    conf = round(float(preds[idx]), 4)
    gc.collect()
    return {
        "slug": CLASSES[idx]["slug"],
        "label": CLASSES[idx]["label"],
        "confidence": conf,
        "needs_retake": conf < 0.65,
    }


def hash_pw(pw: str) -> str:
    salt = secrets.token_hex(16)
    return f"{salt}${hashlib.pbkdf2_hmac('sha256', pw.encode(), salt.encode(), 100000).hex()}"


def verify_pw(pw: str, stored: str) -> bool:
    try:
        salt, dig = stored.split("$", 1)
        return hmac.compare_digest(
            dig, hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100000).hex()
        )
    except Exception:
        return False


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization.split(" ", 1).strip()
    uid = verify_token(token)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid session.")
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, email, role FROM users WHERE id = %s", (uid,))
            u = cur.fetchone()
            if not u:
                raise HTTPException(status_code=401, detail="User not found.")
            return u
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


def seed_users():
    try:
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("ALTER TABLE reports MODIFY COLUMN image_path LONGTEXT")
                cur.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(32) NOT NULL DEFAULT 'citizen'")
                for name, email, role in [
                    ("Aarav Sharma", "citizen@test.com", "citizen"),
                    ("Officer Verma", "officer@nagarnigam.gov.in", "gov"),
                    ("Ramesh Patel", "worker@nagarnigam.gov.in", "worker"),
                    ("System Admin", "admin@nagarnigam.gov.in", "admin"),
                ]:
                    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                    if not cur.fetchone():
                        cur.execute(
                            "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s)",
                            (name, email, hash_pw("password123"), role),
                        )
            conn.commit()
        finally:
            conn.close()
    except Exception as e:
        print("Seed warning:", e)


@app.on_event("startup")
def on_startup():
    seed_users()


@app.get("/")
def root_health():
    return {"status": "ok", "service": "Click-2-Clean API"}


@app.get("/api/profile")
def get_profile(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM reports WHERE user_id = %s", (user["id"],))
            row = cur.fetchone()
        return {**user, "report_count": row["total"] if row else 0}
    finally:
        conn.close()


@app.post("/api/register", status_code=201)
def register(payload: RegisterSchema):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, 'citizen')",
                (payload.name, payload.email.lower().strip(), hash_pw(payload.password)),
            )
        conn.commit()
        return {"message": "Registered"}
    finally:
        conn.close()


@app.post("/api/login")
def login(payload: LoginSchema):
    seed_users()
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE email = %s", (payload.email.lower().strip(),))
            u = cur.fetchone()
    finally:
        conn.close()
    if not u or not verify_pw(payload.password, u["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    tok = create_token(u["id"])
    return {
        "token": tok,
        "user": {"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"]},
    }


@app.post("/api/logout")
def logout():
    return {"message": "Logged out"}


def format_row(r: dict) -> dict:
    slug = r["category_slug"]
    return {
        "id": r["id"],
        "user_id": r["user_id"],
        "user_name": r.get("user_name"),
        "image_url": r["image_path"],
        "category": {"slug": slug, "label": LABEL_MAP.get(slug, slug)},
        "corrected_slug": r.get("corrected_slug"),
        "confidence": float(r["confidence"]),
        "needs_retake": bool(r["needs_retake"]),
        "latitude": float(r["latitude"]),
        "longitude": float(r["longitude"]),
        "ward": r.get("ward") or "Ward 12 - Morar",
        "remarks": r.get("remarks") or "",
        "status": r["status"],
    }


@app.post("/api/reports", status_code=201)
async def create_report(
    file: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    remarks: str = Form(""),
    ward: str = Form("Ward 12 - Morar"),
    user: dict = Depends(get_current_user),
):
    raw = await file.read()
    fname = f"{uuid.uuid4().hex}.jpg"
    fpath = os.path.join(UPLOAD_DIR, fname)
    with open(fpath, "wb") as f:
        f.write(raw)

    pred = predict_waste(fpath)

    # Store compressed JPEG base64 URI in MySQL so images persist across Render restarts
    thumb = Image.open(fpath).convert("RGB")
    thumb.thumbnail((640, 640))
    buf = io.BytesIO()
    thumb.save(buf, format="JPEG", quality=75)
    data_uri = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO reports (user_id, image_path, category_slug, confidence, needs_retake, latitude, longitude, ward, remarks, status) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,'reported')",
                (
                    user["id"],
                    data_uri,
                    pred["slug"],
                    pred["confidence"],
                    pred["needs_retake"],
                    latitude,
                    longitude,
                    ward,
                    remarks,
                ),
            )
            rid = cur.lastrowid
            cur.execute(
                "SELECT r.*, u.name AS user_name FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = %s",
                (rid,),
            )
            row = cur.fetchone()
        conn.commit()
        return format_row(row)
    finally:
        conn.close()


@app.get("/api/reports")
def get_reports(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            if user["role"] == "citizen":
                cur.execute(
                    "SELECT r.*, u.name AS user_name FROM reports r JOIN users u ON r.user_id = u.id WHERE r.user_id = %s ORDER BY r.id DESC",
                    (user["id"],),
                )
            else:
                cur.execute(
                    "SELECT r.*, u.name AS user_name FROM reports r JOIN users u ON r.user_id = u.id ORDER BY r.id DESC"
                )
            return [format_row(r) for r in cur.fetchall()]
    finally:
        conn.close()


@app.get("/api/reports/{report_id}")
def get_report(report_id: int, user: dict = Depends(get_current_user)):
conn = get_db_connection()
try:
with conn.cursor() as cur:
cur.execute(
"SELECT r.*, u.name AS user_name FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = %s",
(report_id,),
)
row = cur.fetchone()
if not row:
raise HTTPException(status_code=404, detail="Not found")
return format_row(row)
finally:
conn.close()
@app.patch("/api/reports/{report_id}")
def patch_report(report_id: int, payload: PatchReportSchema, user: dict = Depends(get_current_user)):
conn = get_db_connection()
try:
with conn.cursor() as cur:
if payload.corrected_slug:
cur.execute(
"UPDATE reports SET corrected_slug = %s WHERE id = %s",
(payload.corrected_slug, report_id),
)
if payload.status:
cur.execute(
"UPDATE reports SET status = %s WHERE id = %s",
(payload.status, report_id),
)
cur.execute(
"SELECT r.*, u.name AS user_name FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = %s",
(report_id,),
)
row = cur.fetchone()
conn.commit()
return format_row(row)
finally:
conn.close()
@app.delete("/api/reports/{report_id}")
def del_report(report_id: int, user: dict = Depends(get_current_user)):
conn = get_db_connection()
try:
with conn.cursor() as cur:
cur.execute("DELETE FROM reports WHERE id = %s", (report_id,))
conn.commit()
return {"deleted": True}
finally:
conn.close()
@app.get("/api/admin/users")
def list_users(user: dict = Depends(get_current_user)):
conn = get_db_connection()
try:
with conn.cursor() as cur:
cur.execute("SELECT id, name, email, role FROM users ORDER BY id ASC")
return cur.fetchall()
finally:
conn.close()
@app.get("/api/admin/wards")
def list_wards(user: dict = Depends(get_current_user)):
conn = get_db_connection()
try:
with conn.cursor() as cur:
cur.execute("SELECT * FROM wards ORDER BY id ASC")
return cur.fetchall()
finally:
conn.close()
@app.get("/api/admin/alerts")
def list_alerts(user: dict = Depends(get_current_user)):
conn = get_db_connection()
try:
with conn.cursor() as cur:
cur.execute("SELECT * FROM alerts ORDER BY id DESC")
return cur.fetchall()
finally:
conn.close()