from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Report, User
from ..report_cache import invalidate_reports_cache
from ..schemas import (
    CATEGORIES,
    ROLES,
    STATUSES,
    PortalUserOut,
    ReportOut,
    StatsOut,
    StatusUpdate,
    UserCreate,
    UserUpdate,
    report_out,
)
from ..security import AuthenticatedUser, get_current_admin, hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


def _validate_account(name: str, email: str, role: str) -> tuple[str, str]:
    name = name.strip()
    email = email.strip().lower()
    if not name or len(name) > 120:
        raise HTTPException(422, "Enter a name between 1 and 120 characters.")
    if "@" not in email or len(email) > 254:
        raise HTTPException(422, "Enter a valid email address.")
    if role not in ROLES:
        raise HTTPException(422, "Unknown account role.")
    return name, email


@router.get("/users", response_model=list[PortalUserOut])
def list_users(db: Session = Depends(get_db)):
    users = db.scalars(select(User).order_by(User.id)).all()
    return [PortalUserOut(id=user.id, name=user.name, email=user.email, role=user.role) for user in users]


@router.post("/users", response_model=PortalUserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    name, email = _validate_account(body.name, body.email, body.role)
    if len(body.password) < 6:
        raise HTTPException(422, "Password must be at least 6 characters.")
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(409, "An account with this email already exists.")
    user = User(
        name=name,
        email=email,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return PortalUserOut(id=user.id, name=user.name, email=user.email, role=user.role)


@router.put("/users/{user_id}", response_model=PortalUserOut)
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found.")
    name, email = _validate_account(body.name, body.email, body.role)
    existing = db.scalar(select(User).where(User.email == email, User.id != user_id))
    if existing is not None:
        raise HTTPException(409, "An account with this email already exists.")
    user.name = name
    user.email = email
    user.role = body.role
    db.commit()
    invalidate_reports_cache()
    return PortalUserOut(id=user.id, name=user.name, email=user.email, role=user.role)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: AuthenticatedUser = Depends(get_current_admin),
):
    if user_id == current_admin.id:
        raise HTTPException(400, "You cannot delete your own account.")
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found.")
    if user.role == "admin":
        admin_count = db.scalar(
            select(func.count(User.id)).where(User.role == "admin")
        ) or 0
        if admin_count <= 1:
            raise HTTPException(409, "The last administrator account cannot be deleted.")
    db.execute(update(Report).where(Report.user_id == user_id).values(user_id=None))
    db.execute(
        update(Report)
        .where(Report.assigned_worker_id == user_id)
        .values(assigned_worker_id=None)
    )
    db.delete(user)
    db.commit()
    invalidate_reports_cache()
    return None


@router.get("/reports", response_model=list[ReportOut])
def list_reports(
    status: str | None = Query(None),
    category: str | None = Query(None),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    if status and status not in STATUSES:
        raise HTTPException(422, "Unknown status.")
    if category and category not in CATEGORIES:
        raise HTTPException(422, "Unknown category.")
    q = select(Report).order_by(Report.created_at.desc(), Report.id.desc())
    if status:
        q = q.where(Report.status == status)
    if category:
        q = q.where(Report.category == category)
    rows = db.scalars(q.limit(limit).offset(offset)).all()
    return [report_out(r) for r in rows]


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db)):
    by_status = {s: 0 for s in STATUSES}
    by_category = {c: 0 for c in CATEGORIES}
    for s, n in db.execute(select(Report.status, func.count()).group_by(Report.status)):
        by_status[s] = n
    for c, n in db.execute(select(Report.category, func.count()).group_by(Report.category)):
        by_category[c] = n
    return StatsOut(total=sum(by_status.values()), by_status=by_status, by_category=by_category)


@router.patch("/reports/{report_id}", response_model=ReportOut)
def update_status(report_id: int, body: StatusUpdate, db: Session = Depends(get_db)):
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(404, "Report not found.")
    report.status = body.status
    db.commit()
    db.refresh(report)
    invalidate_reports_cache()
    return report_out(report)
