from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import sqlite3
import datetime
import os
import shutil

app = FastAPI(title="CleanGWL Waste Management Platform Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory and serve images statically
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

DB_FILE = "click2clean.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT, email TEXT UNIQUE, password TEXT, role TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        waste_type TEXT, coordinates TEXT, ward TEXT,
        remarks TEXT, image_url TEXT, status TEXT, created_at TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS wards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ward TEXT, email TEXT, telegram TEXT
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY, reportId INTEGER, ward TEXT,
        channel TEXT, time TEXT, status TEXT
    )""")

    # Seed default demo accounts if empty
    if c.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        c.executemany("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)", [
            ("Aarav Sharma", "citizen@test.com", "password123", "citizen"),
            ("Officer Verma", "officer@nagarnigam.gov.in", "password123", "gov"),
            ("System Admin", "admin@nagarnigam.gov.in", "password123", "admin")
        ])
    if c.execute("SELECT COUNT(*) FROM wards").fetchone()[0] == 0:
        c.executemany("INSERT INTO wards (ward, email, telegram) VALUES (?, ?, ?)", [
            ("Ward 12 - Morar", "ward12.nn@gov.in", "@ward12_alert_bot"),
            ("Ward 14 - City Center", "ward14.nn@gov.in", "@ward14_alert_bot")
        ])
    if c.execute("SELECT COUNT(*) FROM reports").fetchone()[0] == 0:
        c.execute("""INSERT INTO reports (waste_type, coordinates, ward, remarks, image_url, status, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)""",
                  ("Plastic", "26.2183, 78.1828", "Ward 12 - Morar", "Near Morar Main Market crossroads.", "", "Pending", str(datetime.date.today())))
    conn.commit()
    conn.close()

init_db()

# --- Schemas ---
class UserLoginPayload(BaseModel):
    email: str
    password: str

class UserRegisterPayload(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "citizen"

class ProfileUpdateSchema(BaseModel):
    email: str
    name: str
    password: Optional[str] = None

class StatusUpdateSchema(BaseModel):
    status: str

class RoleUpdateSchema(BaseModel):
    role: str

class WardCreateSchema(BaseModel):
    ward: str
    email: str
    telegram: str

# --- Routes ---
@app.get("/")
def read_root():
    return {"status": "CleanGWL SQLite Engine Operational"}

@app.post("/api/register")
def register_user(payload: UserRegisterPayload):
    conn = get_db()
    try:
        conn.execute("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
                     (payload.name, payload.email.strip().lower(), payload.password, payload.role))
        conn.commit()
        return {"success": True}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Email already registered.")
    finally:
        conn.close()

@app.post("/api/login")
def process_login_auth(payload: UserLoginPayload):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (payload.email.strip().lower(),)).fetchone()
    conn.close()
    if not user or user["password"] != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {
        "success": True,
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "token": f"session-key-{user['role']}"
    }

@app.patch("/api/profile")
def update_profile(payload: ProfileUpdateSchema):
    conn = get_db()
    if payload.password:
        conn.execute("UPDATE users SET name = ?, password = ? WHERE email = ?",
                     (payload.name, payload.password, payload.email))
    else:
        conn.execute("UPDATE users SET name = ? WHERE email = ?", (payload.name, payload.email))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Profile updated successfully."}

@app.get("/api/users")
def get_all_users():
    conn = get_db()
    rows = conn.execute("SELECT id, name, email, role FROM users").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.patch("/api/users/{email}")
def update_user_role(email: str, payload: RoleUpdateSchema):
    conn = get_db()
    conn.execute("UPDATE users SET role = ? WHERE email = ?", (payload.role, email))
    conn.commit()
    conn.close()
    return {"success": True}

@app.delete("/api/users/{email}")
def delete_user(email: str):
    conn = get_db()
    conn.execute("DELETE FROM users WHERE email = ?", (email,))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/api/reports")
def get_all_reports():
    conn = get_db()
    rows = conn.execute("SELECT * FROM reports ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/reports")
async def create_new_report(
    waste_type: str = Form(...),
    coordinates: str = Form(...),
    ward: str = Form("Ward 12 - Morar"),
    remarks: str = Form(""),
    photo: Optional[UploadFile] = File(None)
):
    image_url = ""
    if photo and photo.filename:
        safe_name = f"{int(datetime.datetime.now().timestamp())}_{photo.filename}"
        file_path = os.path.join("uploads", safe_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        image_url = f"/uploads/{safe_name}"

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""INSERT INTO reports (waste_type, coordinates, ward, remarks, image_url, status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (waste_type, coordinates, ward, remarks, image_url, "Pending", str(datetime.date.today())))
    new_id = cur.lastrowid

    cur.execute("""INSERT INTO alerts (id, reportId, ward, channel, time, status)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (f"AL-{500 + new_id}", new_id, ward, "Telegram & Email",
                 datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p"), "Delivered"))
    conn.commit()
    conn.close()
    return {"success": True, "data": {"id": new_id, "image_url": image_url}}

@app.patch("/api/reports/{report_id}")
def update_report_status(report_id: int, payload: StatusUpdateSchema):
    conn = get_db()
    conn.execute("UPDATE reports SET status = ? WHERE id = ?", (payload.status, report_id))
    conn.commit()
    conn.close()
    return {"success": True}

@app.delete("/api/reports/{report_id}")
def delete_report(report_id: int):
    conn = get_db()
    conn.execute("DELETE FROM reports WHERE id = ?", (report_id,))
    conn.commit()
    conn.close()
    return {"success": True}

@app.get("/api/wards")
def get_wards():
    conn = get_db()
    rows = conn.execute("SELECT * FROM wards").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/wards")
def add_ward(payload: WardCreateSchema):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO wards (ward, email, telegram) VALUES (?, ?, ?)",
                (payload.ward, payload.email, payload.telegram))
    new_id = cur.lastrowid
    conn.commit()
    conn.close()
    return {"success": True, "data": {"id": new_id, **payload.dict()}}

@app.get("/api/alerts")
def get_alerts():
    conn = get_db()
    rows = conn.execute("SELECT * FROM alerts ORDER BY reportId DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]
