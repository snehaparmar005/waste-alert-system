import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AdminUser, User
from ..schemas import (
    LoginIn,
    PortalLoginIn,
    PortalSessionOut,
    PortalUserOut,
    RegisterIn,
    TokenOut,
)
from ..security import DUMMY_HASH, create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])
portal_router = APIRouter(prefix="/api", tags=["portal authentication"])

# Very small in-memory brake on password guessing (per client IP).
# It resets when the server restarts and is per-process; use a reverse proxy
# or Redis-based limiter if you run several workers.
_WINDOW_SECONDS = 15 * 60
_MAX_FAILURES = 10
_failures: dict[str, deque] = defaultdict(deque)


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _check_login_attempts(request: Request) -> tuple[str, deque]:
    key = _client_key(request)
    now = time.monotonic()
    attempts = _failures[key]
    while attempts and now - attempts[0] > _WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= _MAX_FAILURES:
        raise HTTPException(429, "Too many attempts. Please wait a few minutes and try again.")
    return key, attempts


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    key, attempts = _check_login_attempts(request)

    user = db.scalar(select(AdminUser).where(AdminUser.username == body.username.strip()))
    ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    if not user or not ok:
        attempts.append(time.monotonic())
        raise HTTPException(401, "Wrong username or password.")
    attempts.clear()
    return TokenOut(access_token=create_access_token(user.username))


@portal_router.post("/login", response_model=PortalSessionOut)
def portal_login(body: PortalLoginIn, request: Request, db: Session = Depends(get_db)):
    key, attempts = _check_login_attempts(request)
    email = body.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    password_hash = user.password_hash if user else DUMMY_HASH
    valid_password = verify_password(body.password, password_hash)

    if user is not None and valid_password:
        attempts.clear()
        token = create_access_token(user.email, user_id=user.id, role=user.role)
        return PortalSessionOut(
            token=token,
            user=PortalUserOut(id=user.id, name=user.name, email=user.email, role=user.role),
        )

    legacy_admin = db.scalar(select(AdminUser).where(AdminUser.username == body.email.strip()))
    legacy_valid = verify_password(
        body.password,
        legacy_admin.password_hash if legacy_admin else DUMMY_HASH,
    )
    if legacy_admin is not None and legacy_valid:
        attempts.clear()
        token = create_access_token(legacy_admin.username)
        return PortalSessionOut(
            token=token,
            user=PortalUserOut(
                id=legacy_admin.id,
                name=legacy_admin.username,
                email=legacy_admin.username,
                role="admin",
            ),
        )

    attempts.append(time.monotonic())
    raise HTTPException(401, "Wrong email or password.")


@portal_router.post("/register", response_model=PortalUserOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    name = body.name.strip()
    email = body.email.strip().lower()
    if not name or len(name) > 120:
        raise HTTPException(422, "Enter a name between 1 and 120 characters.")
    if "@" not in email or len(email) > 254:
        raise HTTPException(422, "Enter a valid email address.")
    if len(body.password) < 6:
        raise HTTPException(422, "Password must be at least 6 characters.")
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(409, "An account with this email already exists.")

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(body.password),
        role="citizen",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return PortalUserOut(id=user.id, name=user.name, email=user.email, role=user.role)
