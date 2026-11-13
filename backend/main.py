from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import datetime

app = FastAPI(title="CleanGWL Waste Management Platform Engine")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class UserLoginPayload(BaseModel):
    email: str
    password: str

class UserRegisterPayload(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "citizen"

class WasteReportCreate(BaseModel):
    waste_type: str
    coordinates: str
    remarks: Optional[str] = None
    ward: Optional[str] = "Ward 12 - Morar"

class StatusUpdateSchema(BaseModel):
    status: str

class RoleUpdateSchema(BaseModel):
    role: str

class WardCreateSchema(BaseModel):
    ward: str
    email: str
    telegram: str

# --- In-Memory Databases ---
MOCK_ACCOUNTS_REGISTRY = {
    "citizen@test.com": {"id": 1, "name": "Aarav Sharma", "role": "citizen", "password": "password123"},
    "officer@nagarnigam.gov.in": {"id": 2, "name": "Officer Verma", "role": "gov", "password": "password123"},
    "admin@nagarnigam.gov.in": {"id": 3, "name": "System Admin", "role": "admin", "password": "password123"}
}

mock_reports_db = [
    {
        "id": 1,
        "waste_type": "Plastic",
        "coordinates": "26.2183, 78.1828",
        "ward": "Ward 12 - Morar",
        "remarks": "Near Morar Main Market crossroads area.",
        "status": "Pending",
        "created_at": "2026-11-12"
    }
]

mock_wards_db = [
    {"id": 1, "ward": "Ward 12 - Morar", "email": "ward12.nn@gov.in", "telegram": "@ward12_alert_bot"},
    {"id": 2, "ward": "Ward 14 - City Center", "email": "ward14.nn@gov.in", "telegram": "@ward14_alert_bot"}
]

mock_alerts_db = [
    {"id": "AL-501", "reportId": 1, "ward": "Ward 12 - Morar", "channel": "Telegram & Email", "time": "2026-11-12 10:15 AM", "status": "Delivered"}
]

# =====================================================================
#                          API ENDPOINTS
# =====================================================================

@app.get("/")
def read_root():
    return {"status": "CleanGWL Engine Operational"}

# --- Auth & Users ---
@app.post("/api/register")
def register_user(payload: UserRegisterPayload):
    email_clean = payload.email.strip().lower()
    if email_clean in MOCK_ACCOUNTS_REGISTRY:
        raise HTTPException(status_code=400, detail="Email already registered.")
    
    new_id = len(MOCK_ACCOUNTS_REGISTRY) + 1
    MOCK_ACCOUNTS_REGISTRY[email_clean] = {
        "id": new_id,
        "name": payload.name,
        "role": payload.role,
        "password": payload.password
    }
    return {"success": True, "message": "Account created successfully."}

@app.post("/api/login")
def process_login_auth(payload: UserLoginPayload):
    email_clean = payload.email.strip().lower()
    if email_clean not in MOCK_ACCOUNTS_REGISTRY:
        raise HTTPException(status_code=401, detail="No registered account found with this email.")
        
    user_record = MOCK_ACCOUNTS_REGISTRY[email_clean]
    if payload.password != user_record["password"]:
        raise HTTPException(status_code=401, detail="Incorrect password.")
        
    return {
        "success": True,
        "name": user_record["name"],
        "email": email_clean,
        "role": user_record["role"],
        "token": f"session-key-{user_record['role']}"
    }

@app.get("/api/users")
def get_all_users():
    return [
        {"id": info["id"], "name": info["name"], "email": email, "role": info["role"]}
        for email, info in MOCK_ACCOUNTS_REGISTRY.items()
    ]

@app.patch("/api/users/{email}")
def update_user_role(email: str, payload: RoleUpdateSchema):
    if email not in MOCK_ACCOUNTS_REGISTRY:
        raise HTTPException(status_code=404, detail="User not found.")
    MOCK_ACCOUNTS_REGISTRY[email]["role"] = payload.role
    return {"success": True}

@app.delete("/api/users/{email}")
def delete_user(email: str):
    if email not in MOCK_ACCOUNTS_REGISTRY:
        raise HTTPException(status_code=404, detail="User not found.")
    del MOCK_ACCOUNTS_REGISTRY[email]
    return {"success": True}

# --- Reports ---
@app.get("/api/reports")
def get_all_reports():
    return mock_reports_db

@app.post("/api/reports")
def create_new_report(report: WasteReportCreate):
    new_id = len(mock_reports_db) + 1
    new_report = {
        "id": new_id,
        "waste_type": report.waste_type,
        "coordinates": report.coordinates,
        "ward": report.ward,
        "remarks": report.remarks,
        "status": "Pending",
        "created_at": str(datetime.date.today())
    }
    mock_reports_db.append(new_report)
    
    # Automatically log an alert
    mock_alerts_db.append({
        "id": f"AL-{500 + new_id}",
        "reportId": new_id,
        "ward": report.ward,
        "channel": "Telegram & Email",
        "time": datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p"),
        "status": "Delivered"
    })
    return {"success": True, "data": new_report}

@app.patch("/api/reports/{report_id}")
def update_report_status(report_id: int, payload: StatusUpdateSchema):
    for report in mock_reports_db:
        if report["id"] == report_id:
            report["status"] = payload.status
            return {"success": True, "message": f"Status updated to {payload.status}"}
    raise HTTPException(status_code=404, detail="Report ID not found.")

@app.delete("/api/reports/{report_id}")
def delete_report(report_id: int):
    global mock_reports_db
    mock_reports_db = [r for r in mock_reports_db if r["id"] != report_id]
    return {"success": True}

# --- Wards & Alerts ---
@app.get("/api/wards")
def get_wards():
    return mock_wards_db

@app.post("/api/wards")
def add_ward(payload: WardCreateSchema):
    new_ward = {"id": len(mock_wards_db) + 1, **payload.dict()}
    mock_wards_db.append(new_ward)
    return {"success": True, "data": new_ward}

@app.get("/api/alerts")
def get_alerts():
    return mock_alerts_db
