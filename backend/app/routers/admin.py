from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from ..db import get_db
from ..models import User, AiUsage, Task
from ..deps import require_admin
from ..security import make_admin_token, verify_password, hash_password
from ..config import settings

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminLoginIn(BaseModel):
    phone: str
    password: str


class SetPremiumIn(BaseModel):
    isPremium: bool


class SetPasswordIn(BaseModel):
    password: str


@router.post("/login")
def admin_login(body: AdminLoginIn):
    phone_match = body.phone.strip() == settings.ADMIN_PHONE.strip()
    password_match = body.password.strip() == settings.ADMIN_PASSWORD.strip()
    if not phone_match or not password_match:
        raise HTTPException(status_code=401, detail="invalid credentials")
    return {"accessToken": make_admin_token()}


@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _: None = Depends(require_admin)):
    total_users = db.execute(select(func.count(User.id))).scalar_one()
    premium_users = db.execute(select(func.count(User.id)).where(User.isPremium == True)).scalar_one()
    verified_users = db.execute(select(func.count(User.id)).where(User.phoneVerified == True)).scalar_one()
    day_ago = datetime.utcnow() - timedelta(hours=24)
    ai_calls_today = db.execute(select(func.count(AiUsage.id)).where(AiUsage.createdAt >= day_ago)).scalar_one()
    total_tasks = db.execute(select(func.count(Task.id))).scalar_one()
    return {
        "totalUsers": total_users,
        "premiumUsers": premium_users,
        "verifiedUsers": verified_users,
        "aiCallsToday": ai_calls_today,
        "totalTasks": total_tasks,
    }


@router.get("/users")
def list_users(
    search: Optional[str] = None,
    premium: Optional[bool] = None,
    offset: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    q = select(User).order_by(User.createdAt.desc())
    if search:
        q = q.where(User.phone.ilike(f"%{search}%"))
    if premium is not None:
        q = q.where(User.isPremium == premium)
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    users = db.execute(q.offset(offset).limit(limit)).scalars().all()

    day_ago = datetime.utcnow() - timedelta(hours=24)
    result = []
    for u in users:
        ai_today = db.execute(
            select(func.count(AiUsage.id)).where(AiUsage.userId == u.id, AiUsage.createdAt >= day_ago)
        ).scalar_one()
        task_count = db.execute(select(func.count(Task.id)).where(Task.userId == u.id)).scalar_one()
        result.append({
            "id": u.id,
            "phone": u.phone,
            "phoneVerified": u.phoneVerified,
            "isPremium": u.isPremium,
            "points": u.points,
            "aiCallsToday": ai_today,
            "taskCount": task_count,
            "createdAt": u.createdAt.isoformat(),
        })
    return {"users": result, "total": total}


@router.put("/users/{user_id}/premium")
def set_premium(
    user_id: str,
    body: SetPremiumIn,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="user not found")
    u.isPremium = body.isPremium
    db.commit()
    return {"id": u.id, "phone": u.phone, "isPremium": u.isPremium}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="user not found")
    db.delete(u)
    db.commit()
    return {"ok": True}


@router.post("/users/{user_id}/disable-2fa")
def disable_2fa(
    user_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="user not found")
    u.totpEnabled = False
    u.totpSecret = None
    u.totpBackupCodes = []
    db.commit()
    return {"ok": True}


@router.put("/users/{user_id}/password")
def reset_password(
    user_id: str,
    body: SetPasswordIn,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=404, detail="user not found")
    u.password = hash_password(body.password)
    db.commit()
    return {"ok": True}
