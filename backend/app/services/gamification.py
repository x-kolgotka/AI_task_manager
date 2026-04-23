from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from ..models import User, Task, Achievement, TaskStatus, AiUsage
from ..ids import cuid


BADGES = {
    "first_task": {"title": "First steps", "description": "Completed your first task", "points": 10},
    "ten_tasks": {"title": "Getting serious", "description": "10 tasks completed", "points": 30},
    "fifty_tasks": {"title": "Productivity machine", "description": "50 tasks completed", "points": 100},
    "hundred_tasks": {"title": "Leader", "description": "100 tasks completed", "points": 250},
    "streak_7": {"title": "On the wave", "description": "7-day completion streak", "points": 50},
    "ai_master": {"title": "AI master", "description": "Used AI 10 times", "points": 40},
    "night_owl": {"title": "Night owl", "description": "Completed a task after 22:00", "points": 15},
}


def _has(db: Session, user_id: str, badge: str) -> bool:
    return db.execute(
        select(Achievement).where(Achievement.userId == user_id, Achievement.badge == badge)
    ).scalar_one_or_none() is not None


def _grant(db: Session, user: User, badge: str) -> Achievement | None:
    if badge not in BADGES or _has(db, user.id, badge):
        return None
    meta = BADGES[badge]
    row = Achievement(
        id=cuid(), userId=user.id, badge=badge,
        title=meta["title"], description=meta["description"], points=meta["points"],
    )
    db.add(row)
    user.points = (user.points or 0) + meta["points"]
    db.commit()
    db.refresh(row)
    return row


def on_task_completed(db: Session, user: User, task: Task) -> list[Achievement]:
    awarded: list[Achievement] = []
    completed_count = db.execute(
        select(func.count(Task.id)).where(Task.userId == user.id, Task.status == TaskStatus.DONE)
    ).scalar_one()
    thresholds = [(1, "first_task"), (10, "ten_tasks"), (50, "fifty_tasks"), (100, "hundred_tasks")]
    for n, badge in thresholds:
        if completed_count >= n:
            a = _grant(db, user, badge)
            if a:
                awarded.append(a)
    now = datetime.utcnow()
    if now.hour >= 22:
        a = _grant(db, user, "night_owl")
        if a:
            awarded.append(a)
    # 7-day streak: any completed task in each of last 7 days
    start = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
    dates_done = db.execute(
        select(func.date(Task.updatedAt)).distinct()
        .where(Task.userId == user.id, Task.status == TaskStatus.DONE, Task.updatedAt >= start)
    ).scalars().all()
    if len(set(dates_done)) >= 7:
        a = _grant(db, user, "streak_7")
        if a:
            awarded.append(a)
    return awarded


def on_ai_used(db: Session, user: User) -> Achievement | None:
    usage_count = db.execute(
        select(func.count(AiUsage.id)).where(AiUsage.userId == user.id)
    ).scalar_one()
    if usage_count >= 10:
        return _grant(db, user, "ai_master")
    return None
