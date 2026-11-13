from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import datetime

# --- Initialize the FastAPI Engine Application Instance ---
app = FastAPI(title="CleanGWL Waste Management Platform Engine")

# --- 🔴 CRITICAL CORS SECURITY MIDDLEWARE CONFIGURATION MATRIX 🔴 ---
# This permits your Vite React Frontend (running on port 5173) to securely communicate 
# with this local Python Backend server process (running on port 8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Data Validation Validation Pydantic Schemas ---
class UserLoginPayload(BaseModel):
    email: str
    password: str

class WasteReportCreate(BaseModel):
    waste_type: str
    coordinates: str
    remarks: Optional[str] = None

class StatusUpdateSchema(BaseModel):
    status: str


# --- Multi-Role Authorization Users Simulator Registry Database ---
MOCK_ACCOUNTS_REGISTRY = {
    "citizen@test.com": {"role": "citizen", "password": "password123"},
    "officer@nagarnigam.gov.in": {"role": "gov", "password": "password123"},
    "admin@nagarnigam.gov.in": {"role": "admin", "password": "password123"}
}


# --- In-Memory Incidents Complaints Tracking Simulation Arrays ---
mock_reports_db = [
    {
        "id": 1,
        "waste_type": "Garbage Pile",
        "coordinates": "26.2183, 78.1828",
        "remarks": "Near Morar Main Market crossroads area.",
        "status": "Pending",
        "created_at": "2026-10-24"
    }
]


# =====================================================================
#                          OPERATIONAL SERVER ROUTES
# =====================================================================

@app.get("/")
def read_root():
    """Heartbeat endpoint to verify server is active."""
    return {"status": "CleanGWL Engine Processing Instance Operational"}


@app.post("/api/login")
def process_login_auth(payload: UserLoginPayload):
    """Handles unified credential authorization and role assignment routing."""
    email_clean = payload.email.strip().lower()
    
    # 1. Look up if the incoming email address exists inside our database registry
    if email_clean not in MOCK_ACCOUNTS_REGISTRY:
        raise HTTPException(status_code=401, detail="No registered account found with this email address.")
        
    user_record = MOCK_ACCOUNTS_REGISTRY[email_clean]
    
    # 2. Check if the provided text matches the saved record password string
    if payload.password != user_record["password"]:
        raise HTTPException(status_code=401, detail="Incorrect password credentials. Please try again.")
        
    # 3. If matching parameters are valid, return success confirmation alongside user role
    return {
        "success": True, 
        "message": "Access authorized successfully.", 
        "role": user_record["role"],
        "token": f"session-key-{user_record['role']}"
    }


@app.get("/api/reports")
def get_all_reports():
    """Fetches master list of all complaints filed across the municipal wards."""
    return mock_reports_db


@app.post("/api/reports")
def create_new_report(report: WasteReportCreate):
    """Registers a fresh citizen complaint into the system records array."""
    new_report = {
        "id": len(mock_reports_db) + 1,
        "waste_type": report.waste_type,
        "coordinates": report.coordinates,
        "remarks": report.remarks,
        "status": "Pending",
        "created_at": str(datetime.date.today())
    }
    mock_reports_db.append(new_report)
    return {"success": True, "data": new_report}


@app.patch("/api/reports/{report_id}")
def update_report_status(report_id: int, payload: StatusUpdateSchema):
    """Allows admin/officer entities to update complaint workflow execution status."""
    for report in mock_reports_db:
        if report["id"] == report_id:
            report["status"] = payload.status
            return {"success": True, "message": f"Report status changed to {payload.status}"}
            
    raise HTTPException(status_code=404, detail="Target complaint filing ID not located in registry.")
