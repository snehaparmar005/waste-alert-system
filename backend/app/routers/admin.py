from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Report
from ..schemas import CATEGORIES, STATUSES, ReportOut, StatsOut, StatusUpdate, report_out
from ..security import get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


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
    return report_out(report)
