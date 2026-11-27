from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, select, text

from . import models
from .config import ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME, CORS_ORIGINS, UPLOAD_DIR
from .database import Base, SessionLocal, engine
from .routers import admin, auth, reports, workers
from .security import hash_password


def migrate_report_columns() -> None:
    columns_to_add = {
        "user_id": "INTEGER NULL",
        "assigned_worker_id": "INTEGER NULL",
        "ward": "VARCHAR(120) NULL",
        "description": "TEXT NULL",
        "remarks": "TEXT NULL",
    }
    indexes_to_add = {
        "ix_reports_user_id": "user_id",
        "ix_reports_assigned_worker_id": "assigned_worker_id",
    }
    with engine.begin() as connection:
        inspector = inspect(connection)
        if not inspector.has_table("reports"):
            return
        columns = {column["name"] for column in inspector.get_columns("reports")}
        for column, sql_type in columns_to_add.items():
            if column not in columns:
                connection.execute(
                    text(f"ALTER TABLE reports ADD COLUMN {column} {sql_type}")
                )
        index_names = {index["name"] for index in inspector.get_indexes("reports")}
        for index_name, column in indexes_to_add.items():
            if index_name not in index_names:
                connection.execute(
                    text(f"CREATE INDEX {index_name} ON reports ({column})")
                )


def seed_admin() -> None:
    if not ADMIN_USERNAME or not ADMIN_PASSWORD:
        return
    if len(ADMIN_PASSWORD) < 10:
        raise RuntimeError("ADMIN_PASSWORD must be at least 10 characters.")
    admin_email = ADMIN_EMAIL or (
        ADMIN_USERNAME if "@" in ADMIN_USERNAME else f"{ADMIN_USERNAME}@localhost"
    )
    with SessionLocal() as db:
        legacy_admin = db.scalar(
            select(models.AdminUser).where(models.AdminUser.username == ADMIN_USERNAME)
        )
        if legacy_admin is None:
            db.add(
                models.AdminUser(
                    username=ADMIN_USERNAME,
                    password_hash=hash_password(ADMIN_PASSWORD),
                )
            )
        portal_admin = db.scalar(
            select(models.User).where(models.User.email == admin_email)
        )
        if portal_admin is None:
            db.add(
                models.User(
                    name="System Admin",
                    email=admin_email,
                    password_hash=hash_password(ADMIN_PASSWORD),
                    role="admin",
                )
            )
        if legacy_admin is None or portal_admin is None:
            db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI):
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    migrate_report_columns()
    seed_admin()
    yield


app = FastAPI(title="Click-2-Clean API", version="1.0.0", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def no_sniff(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


app.include_router(reports.router)
app.include_router(auth.router)
app.include_router(auth.portal_router)
app.include_router(admin.router)
app.include_router(workers.router)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR), check_dir=False), name="uploads")


@app.get("/api/health", tags=["health"])
def health():
    return {"ok": True}
