import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..models import SmsCode
from ..ids import cuid

_sent: list[dict] = []


def _clear():
    _sent.clear()


def sent_log():
    return list(_sent)


def generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def send_sms(db: Session, user_id: str, phone: str) -> SmsCode:
    ten_min_ago = datetime.utcnow() - timedelta(minutes=10)
    recent = db.execute(
        select(SmsCode)
        .where(SmsCode.userId == user_id, SmsCode.createdAt >= ten_min_ago)
        .order_by(SmsCode.createdAt.desc())
    ).scalars().all()
    if len(recent) >= 3:
        raise ValueError("sms rate limit: max 3 per 10 minutes")
    code = generate_code()
    entry = SmsCode(
        id=cuid(),
        userId=user_id,
        code=code,
        expiresAt=datetime.utcnow() + timedelta(minutes=10),
        sendCount=len(recent) + 1,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    _sent.append({"phone": phone, "code": code})
    print(f"[SMS] code for {phone}: {code}")
    return entry


def normalize_phone(raw: str) -> str:
    digits = "".join(c for c in raw if c.isdigit())
    if not digits:
        return ""
    return "+" + digits
