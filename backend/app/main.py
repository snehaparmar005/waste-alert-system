from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from . import models
from .config import ADMIN_PASSWORD, ADMIN_USERNAME, CORS_ORIGINS, UPLOAD_DIR
from .database import Base, SessionLocal, engine
from .routers import admin, auth, reports
from .security import hash_password


def seed_admin() -> None:
    if not ADMIN_USERNAME or not ADMIN_PASSWORD:
        return
    if len(ADMIN_PASSWORD) < 10:
        raise RuntimeError("ADMIN_PASSWORD must be at least 10 characters.")
    with SessionLocal() as db:
        exists = db.scalar(select(models.AdminUser).where(models.AdminUser.username == ADMIN_USERNAME))
        if exists is None:
            db.add(models.AdminUser(username=ADMIN_USERNAME, password_hash=hash_password(ADMIN_PASSWORD)))
            db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    seed_admin()
    yield


app = FastAPI(title="Click-2-Clean API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def no_sniff(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


app.include_router(reports.router)
app.include_router(auth.router)
app.include_router(admin.router)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR), check_dir=False), name="uploads")


@app.get("/api/health", tags=["health"])
def health():
    return {"ok": True}
