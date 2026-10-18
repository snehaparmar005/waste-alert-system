import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from database import get_db_connection

app = FastAPI()

# Enable CORS so your frontend HTML pages can talk to this server securely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Expose the uploads folder so the admin panel can view image URLs directly
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

class UserRegister(BaseModel):
    name: str
    email: str
    password_hash: str

@app.get("/")
def read_root():
    return {"message": "Welcome to Click-2-Clean Backend!"}

@app.post("/register")
def register_user(user: UserRegister):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT user_id FROM users WHERE email = %s", (user.email,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email is already registered!")
            sql = "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)"
            cursor.execute(sql, (user.name, user.email, user.password_hash))
            connection.commit()
        return {"status": "success", "message": f"User {user.name} registered successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()

@app.post("/report")
async def create_report(
    file: UploadFile = File(...),
    address: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...)
):
    # Save image file to local drive folder path
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO reports (user_id, image_path, category_id, confidence, latitude, longitude, address, status) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (None, file_location, None, 0.0, latitude, longitude, address, 'reported'))
            connection.commit()
        return {"status": "success", "message": "Report logged successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()

# --- NEW PORTAL ADMIN ROUTINES ---

@app.get("/admin/reports")
def get_all_reports():
    """Fetches every single complaint row from MySQL database for display."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT report_id, image_path, address, latitude, longitude, status FROM reports ORDER BY report_id DESC")
            result = cursor.fetchall()
            return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()

@app.put("/report/{report_id}/status")
def update_report_status(report_id: int, status: str):
    """Allows municipal workers to mark a report as 'cleaned' inside MySQL."""
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "UPDATE reports SET status = %s WHERE report_id = %s"
            cursor.execute(sql, (status, report_id))
            connection.commit()
        return {"status": "success", "message": f"Report {report_id} status updated to {status}."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()
