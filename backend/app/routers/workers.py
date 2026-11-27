from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Report, User
from ..report_cache import invalidate_reports_cache
from ..schemas import PortalUserOut, WorkerCreate, WorkerUpdate
from ..security import AuthenticatedUser, hash_password, require_roles

router = APIRouter(prefix="/api/workers", tags=["workers"])
_STAFF_ROLES = ("gov", "officer", "admin")


def _validate_worker(name: str, email: str) -> tuple[str, str]:
    name = name.strip()
    email = email.strip().lower()
    if not name or len(name) > 120:
        raise HTTPException(422, "Enter a name between 1 and 120 characters.")
    if "@" not in email or len(email) > 254:
        raise HTTPException(422, "Enter a valid email address.")
    return name, email


@router.get("", response_model=list[PortalUserOut])
def list_workers(
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles(*_STAFF_ROLES)),
):
    workers = db.scalars(
        select(User).where(User.role == "worker").order_by(User.id)
    ).all()
    return [
        PortalUserOut(id=worker.id, name=worker.name, email=worker.email, role=worker.role)
        for worker in workers
    ]


@router.post("", response_model=PortalUserOut, status_code=status.HTTP_201_CREATED)
def create_worker(
    body: WorkerCreate,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles(*_STAFF_ROLES)),
):
    name, email = _validate_worker(body.name, body.email)
    if len(body.password) < 6:
        raise HTTPException(422, "Password must be at least 6 characters.")
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(409, "An account with this email already exists.")
    worker = User(
        name=name,
        email=email,
        password_hash=hash_password(body.password),
        role="worker",
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return PortalUserOut(
        id=worker.id,
        name=worker.name,
        email=worker.email,
        role=worker.role,
    )


@router.put("/{worker_id}", response_model=PortalUserOut)
def update_worker(
    worker_id: int,
    body: WorkerUpdate,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles(*_STAFF_ROLES)),
):
    worker = db.get(User, worker_id)
    if worker is None or worker.role != "worker":
        raise HTTPException(404, "Worker not found.")
    name, email = _validate_worker(body.name, body.email)
    existing = db.scalar(
        select(User).where(User.email == email, User.id != worker_id)
    )
    if existing is not None:
        raise HTTPException(409, "An account with this email already exists.")
    worker.name = name
    worker.email = email
    db.commit()
    invalidate_reports_cache()
    return PortalUserOut(
        id=worker.id,
        name=worker.name,
        email=worker.email,
        role=worker.role,
    )


@router.delete("/{worker_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_worker(
    worker_id: int,
    db: Session = Depends(get_db),
    _: AuthenticatedUser = Depends(require_roles(*_STAFF_ROLES)),
):
    worker = db.get(User, worker_id)
    if worker is None or worker.role != "worker":
        raise HTTPException(404, "Worker not found.")
    db.execute(
        update(Report)
        .where(Report.assigned_worker_id == worker_id)
        .values(assigned_worker_id=None)
    )
    db.delete(worker)
    db.commit()
    invalidate_reports_cache()
    return None
