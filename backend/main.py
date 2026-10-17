import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import get_db_connection

app = FastAPI()

# Enable CORS so your frontend HTML page can securely talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all local browser files to connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create an uploads folder on your laptop to save incoming garbage photos
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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

# --- NEW PORTAL REPORT ROUTER ---
@app.post("/report")
async def create_report(
    file: UploadFile = File(...),
    address: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...)
):
    """Receives garbage details from your frontend page and logs it directly to MySQL."""
    # 1. Save the uploaded file image to your laptop drive
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as buffer:
        buffer.write(await file.read())

    # 2. Open the bridge and insert data into your MySQL filing cabinet
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = """
                INSERT INTO reports (user_id, image_path, category_id, confidence, latitude, longitude, address, status) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            # user_id=None (anonymous citizen), category_id=None (AI hasn't classified it yet), confidence=0.0
            cursor.execute(sql, (None, file_location, None, 0.0, latitude, longitude, address, 'reported'))
            connection.commit()
            
        return {"status": "success", "message": "Report logged successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        connection.close()
