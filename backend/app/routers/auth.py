import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AdminUser
from ..schemas import LoginIn, TokenOut
from ..security import DUMMY_HASH, create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Very small in-memory brake on password guessing (per client IP).
# It resets when the server restarts and is per-process; use a reverse proxy
# or Redis-based limiter if you run several workers.
_WINDOW_SECONDS = 15 * 60
_MAX_FAILURES = 10
_failures: dict[str, deque] = defaultdict(deque)


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    key = _client_key(request)
    now = time.monotonic()
    attempts = _failures[key]
    while attempts and now - attempts[0] > _WINDOW_SECONDS:
        attempts.popleft()
    if len(attempts) >= _MAX_FAILURES:
        raise HTTPException(429, "Too many attempts. Please wait a few minutes and try again.")

    user = db.scalar(select(AdminUser).where(AdminUser.username == body.username.strip()))
    ok = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    if not user or not ok:
        attempts.append(now)
        raise HTTPException(401, "Wrong username or password.")
    attempts.clear()
    return TokenOut(access_token=create_access_token(user.username))
