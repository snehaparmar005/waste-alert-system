import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import JWT_ALGORITHM, JWT_EXPIRE_MINUTES, JWT_SECRET
from .database import get_db
from .models import AdminUser, User

_ITERATIONS = 310_000
_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: int
    name: str
    email: str
    role: str


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"pbkdf2_sha256${_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, iters, salt_hex, hash_hex = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(iters))
        return hmac.compare_digest(digest.hex(), hash_hex)
    except (ValueError, TypeError):
        return False


# Used so a wrong username takes about as long as a wrong password.
DUMMY_HASH = hash_password(secrets.token_urlsafe(16))


def create_access_token(
    username: str,
    *,
    user_id: int | None = None,
    role: str | None = None,
) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": exp}
    if user_id is not None:
        payload["uid"] = user_id
    if role is not None:
        payload["role"] = role
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        "Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _resolve_user(token: str, db: Session) -> AuthenticatedUser:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as error:
        raise _unauthorized() from error

    user_id = payload.get("uid")
    if user_id is not None:
        user = db.get(User, user_id)
        if user is not None:
            return AuthenticatedUser(user.id, user.name, user.email, user.role)
        raise _unauthorized()

    username = payload.get("sub")
    legacy_admin = db.scalar(select(AdminUser).where(AdminUser.username == username))
    if legacy_admin is not None:
        return AuthenticatedUser(
            id=legacy_admin.id,
            name=legacy_admin.username,
            email=legacy_admin.username,
            role="admin",
        )

    user = db.scalar(select(User).where(User.email == username))
    if user is None:
        raise _unauthorized()
    return AuthenticatedUser(user.id, user.name, user.email, user.role)


def get_optional_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> AuthenticatedUser | None:
    return _resolve_user(creds.credentials, db) if creds is not None else None


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    if creds is None:
        raise _unauthorized()
    return _resolve_user(creds.credentials, db)


def require_roles(*roles: str) -> Callable:
    def dependency(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have permission to do this.")
        return user

    return dependency


def get_current_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Administrator access is required.")
    return user
