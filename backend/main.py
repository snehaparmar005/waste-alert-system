import hashlib
import os
import secrets
import uuid

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
    # Frontend still sends the plain password in this field.
    # The server hashes it before saving, so the database never stores plain text.
    password_hash: str


def hash_password(password: str) -> str:
    """Salted PBKDF2 hash, stored as 'salt$hash'. Uses only the standard library."""
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), 100_000
    ).hex()
    return f"{salt}${digest}"


@app.get("/")
def read_root():
    return {"message": "Welcome to Click-2-Clean Backend!"}


@app.post("/register")
def register_user(user: UserRegister):
    email = user.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if not user.password_hash:
        raise HTTPException(status_code=400, detail="Password is required")

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT user_id FROM users WHERE email = %s", (email,))
            if cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email is already registered!")
            sql = "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s)"
            cursor.execute(sql, (user.name, email, hash_password(user.password_hash)))
            connection.commit()
        return {"status": "success", "message": f"User {user.name} registered successfully!"}
    except HTTPException:
        # FIX FOR THE 500 ERROR: let the 400 pass through unchanged.
        # Before, "except Exception" caught the 400 and turned it into a 500.
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()


@app.post("/report")
async def create_report(
    file: UploadFile = File(...),
    address: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
):
    # This endpoint takes multipart FORM DATA (a file plus form fields), not JSON.
    # Sending JSON here is what causes a 422 error.
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    # Random filename: two uploads named "photo.jpg" no longer overwrite each other,
    # and a hostile filename cannot write outside the uploads folder.
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    saved_name = f"{uuid.uuid4().hex}{ext}"
    file_location = f"{UPLOAD_DIR}/{saved_name}"  # forward slash so it works as a URL path

    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())

    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO reports (user_id, image_path, category_id, confidence, latitude, longitude, address, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(
                sql,
                (None, file_location, None, 0.0, latitude, longitude, address, "reported"),
            )
            connection.commit()
            report_id = cursor.lastrowid
        return {
            "status": "success",
            "message": "Report logged successfully!",
            "report_id": report_id,
            "image_url": f"/uploads/{saved_name}",
        }
    except HTTPException:
        raise
    except Exception as e:
        # The DB insert failed, so remove the orphan image.
        if os.path.exists(file_location):
            os.remove(file_location)
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
            cursor.execute(
                "SELECT report_id, image_path, address, latitude, longitude, status "
                "FROM reports ORDER BY report_id DESC"
            )
            return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()


@app.put("/report/{report_id}/status")
def update_report_status(report_id: int, status: str):
    """Allows municipal workers to mark a report as 'cleaned' inside MySQL.

    NOTE: 'status' is a QUERY parameter, so call it like
    PUT /report/1/status?status=cleaned  (in Swagger, type it in the status box).
    Leaving it empty causes a 422 error.
    """
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT report_id FROM reports WHERE report_id = %s", (report_id,))
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Report not found")
            cursor.execute(
                "UPDATE reports SET status = %s WHERE report_id = %s", (status, report_id)
            )
            connection.commit()
        return {"status": "success", "message": f"Report {report_id} status updated to {status}."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()