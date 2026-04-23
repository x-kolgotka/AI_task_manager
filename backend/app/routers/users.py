import secrets
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import User, Preferences, Achievement, EmailVerification
from ..deps import current_user
from ..services import email as email_svc, ai as ai_svc
from ..ids import cuid
from ..config import settings


router = APIRouter(prefix="/api/users", tags=["users"])


class PreferencesOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    theme: str
    language: str
    timezone: str
    timeFormat: str
    weekStart: str
    colorScheme: str
    compactList: bool
    emailNotify: bool
    deadlineReminder: bool
    weeklyReportEmail: bool
    dailyDigest: bool


class PreferencesIn(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    timeFormat: Optional[str] = None
    weekStart: Optional[str] = None
    colorScheme: Optional[str] = None
    compactList: Optional[bool] = None
    emailNotify: Optional[bool] = None
    deadlineReminder: Optional[bool] = None
    weeklyReportEmail: Optional[bool] = None
    dailyDigest: Optional[bool] = None


class EmailIn(BaseModel):
    email: Optional[str] = None


class ActivatePremiumIn(BaseModel):
    code: str


class EmailVerifyIn(BaseModel):
    code: str


class AchievementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    badge: str
    title: str
    description: Optional[str] = None
    points: int
    unlockedAt: datetime


def _get_or_create_prefs(db: Session, user_id: str) -> Preferences:
    p = db.execute(select(Preferences).where(Preferences.userId == user_id)).scalar_one_or_none()
    if p:
        return p
    p = Preferences(id=cuid(), userId=user_id)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/preferences", response_model=PreferencesOut)
def get_preferences(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _get_or_create_prefs(db, user.id)


@router.put("/preferences", response_model=PreferencesOut)
def update_preferences(body: PreferencesIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    p = _get_or_create_prefs(db, user.id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.put("/email")
def set_email(body: EmailIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not body.email:
        user.email = None
        user.emailVerified = False
        db.commit()
        return {"email": None, "emailVerified": False}
    code = "{:06d}".format(secrets.randbelow(1000000))
    db.query(EmailVerification).filter(EmailVerification.userId == user.id).delete()
    ev = EmailVerification(
        id=cuid(), userId=user.id, email=body.email,
        code=code, expiresAt=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(ev)
    db.commit()
    email_svc.send_email(
        body.email, "Verify your email",
        f"<p>Your TaskAI verification code: <strong>{code}</strong>. Valid 10 minutes.</p>",
        text=f"TaskAI verification code: {code}",
    )
    return {"email": body.email, "emailVerified": False, "codeSent": True}


@router.post("/email/verify")
def verify_email(body: EmailVerifyIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    ev = db.execute(
        select(EmailVerification).where(EmailVerification.userId == user.id)
        .order_by(EmailVerification.createdAt.desc())
    ).scalar_one_or_none()
    if not ev:
        raise HTTPException(status_code=400, detail="no pending verification")
    if ev.expiresAt < datetime.utcnow():
        raise HTTPException(status_code=400, detail="code expired")
    if ev.code != body.code.strip():
        raise HTTPException(status_code=400, detail="invalid code")
    user.email = ev.email
    user.emailVerified = True
    db.delete(ev)
    db.commit()
    return {"email": user.email, "emailVerified": True}


@router.get("/quota")
def get_quota(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return ai_svc.get_quota(db, user.id)


@router.post("/activate-premium")
def activate_premium(body: ActivatePremiumIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.isPremium:
        return {"isPremium": True, "alreadyActive": True}
    if not settings.PREMIUM_CODE or body.code.strip() != settings.PREMIUM_CODE:
        raise HTTPException(status_code=400, detail="invalid code")
    user.isPremium = True
    db.commit()
    return {"isPremium": True, "alreadyActive": False}


@router.get("/achievements", response_model=List[AchievementOut])
def list_achievements(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(Achievement).where(Achievement.userId == user.id).order_by(Achievement.unlockedAt.desc())
    ).scalars().all()
    return list(rows)


@router.get("/points")
def my_points(user: User = Depends(current_user)):
    return {"points": user.points}


@router.get("/notifications/outbox")
def outbox(user: User = Depends(current_user)):
    log = [e for e in email_svc.sent_log() if user.email and e["to"] == user.email]
    return {"items": log}


@router.post("/notifications/deadline-check")
def deadline_check(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Trigger deadline-reminder email for upcoming 24h; returns count sent."""
    from datetime import datetime, timedelta
    from ..models import Task, TaskStatus
    if not user.email:
        raise HTTPException(status_code=400, detail="no email set")
    prefs = _get_or_create_prefs(db, user.id)
    if not prefs.deadlineReminder:
        return {"sent": 0, "skipped": "disabled"}
    soon = datetime.utcnow() + timedelta(hours=24)
    tasks = db.execute(
        select(Task).where(
            Task.userId == user.id,
            Task.status != TaskStatus.DONE,
            Task.dueDate.isnot(None),
            Task.dueDate <= soon,
        )
    ).scalars().all()
    if not tasks:
        return {"sent": 0}
    lines = "".join(f"<li>{t.title} — {t.dueDate.isoformat()}</li>" for t in tasks)
    email_svc.send_email(user.email, "Deadline reminders", f"<ul>{lines}</ul>")
    return {"sent": len(tasks)}
