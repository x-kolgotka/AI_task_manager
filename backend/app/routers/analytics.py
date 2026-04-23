from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from ..db import get_db
from ..models import Task, User, TaskStatus, Priority
from ..deps import current_user


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    total = db.execute(select(func.count(Task.id)).where(Task.userId == user.id)).scalar_one()
    by_status = {s.value: 0 for s in TaskStatus}
    rows = db.execute(
        select(Task.status, func.count(Task.id)).where(Task.userId == user.id).group_by(Task.status)
    ).all()
    for s, c in rows:
        by_status[s.value] = c

    by_priority = {p.value: 0 for p in Priority}
    rows = db.execute(
        select(Task.priority, func.count(Task.id)).where(Task.userId == user.id).group_by(Task.priority)
    ).all()
    for p, c in rows:
        by_priority[p.value] = c

    now = datetime.utcnow()
    start = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
    daily_rows = db.execute(
        select(func.date(Task.updatedAt).label("d"), func.count(Task.id))
        .where(Task.userId == user.id, Task.status == TaskStatus.DONE, Task.updatedAt >= start)
        .group_by("d")
    ).all()
    daily_map = {str(d): c for d, c in daily_rows}
    weekly = []
    for i in range(7):
        d = (start + timedelta(days=i)).date().isoformat()
        weekly.append({"day": d, "completed": daily_map.get(d, 0)})

    tags_map: dict[str, int] = {}
    rows = db.execute(select(Task.tags).where(Task.userId == user.id)).scalars().all()
    for tags in rows:
        for t in tags or []:
            tags_map[t] = tags_map.get(t, 0) + 1

    completion_rate = (by_status["DONE"] / total) if total else 0.0
    return {
        "total": total,
        "byStatus": by_status,
        "byPriority": by_priority,
        "weekly": weekly,
        "tags": tags_map,
        "completionRate": completion_rate,
        "points": user.points,
    }
