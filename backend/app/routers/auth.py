from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import User, SmsCode
from ..schemas import RegisterIn, VerifySmsIn, ResendSmsIn, LoginIn, RefreshIn, AuthResponse, UserOut
from ..security import hash_password, verify_password, make_access, make_refresh, decode_refresh
from ..services.sms import send_sms, normalize_phone
from ..deps import current_user
from ..ids import cuid

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _validate_phone(raw: str) -> str:
    p = normalize_phone(raw)
    if len(p) < 8 or len(p) > 20:
        raise HTTPException(status_code=400, detail="invalid phone")
    return p


@router.post("/register", status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    phone = _validate_phone(body.phone)
    existing = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if existing and existing.phoneVerified:
        raise HTTPException(status_code=409, detail="phone already registered")
    if existing:
        existing.password = hash_password(body.password)
        user = existing
    else:
        user = User(id=cuid(), phone=phone, password=hash_password(body.password))
        db.add(user)
    db.commit()
    db.refresh(user)
    try:
        send_sms(db, user.id, phone)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))
    return {"userId": user.id, "phone": phone}


@router.post("/verify-sms", response_model=AuthResponse)
def verify_sms(body: VerifySmsIn, db: Session = Depends(get_db)):
    phone = _validate_phone(body.phone)
    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    code = db.execute(
        select(SmsCode).where(SmsCode.userId == user.id, SmsCode.consumed == False)
        .order_by(SmsCode.createdAt.desc())
    ).scalars().first()
    if not code or code.code != body.code:
        raise HTTPException(status_code=400, detail="invalid code")
    if code.expiresAt < datetime.utcnow():
        raise HTTPException(status_code=400, detail="code expired")
    code.consumed = True
    user.phoneVerified = True
    db.commit()
    db.refresh(user)
    return AuthResponse(
        accessToken=make_access(user.id),
        refreshToken=make_refresh(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/resend-sms")
def resend(body: ResendSmsIn, db: Session = Depends(get_db)):
    phone = _validate_phone(body.phone)
    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    try:
        send_sms(db, user.id, phone)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))
    return {"ok": True}


@router.post("/login", response_model=AuthResponse)
def login(body: LoginIn, db: Session = Depends(get_db)):
    phone = _validate_phone(body.phone)
    user = db.execute(select(User).where(User.phone == phone)).scalar_one_or_none()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=401, detail="invalid credentials")
    if not user.phoneVerified:
        raise HTTPException(status_code=403, detail="phone not verified")
    return AuthResponse(
        accessToken=make_access(user.id),
        refreshToken=make_refresh(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/refresh")
def refresh(body: RefreshIn, db: Session = Depends(get_db)):
    uid = decode_refresh(body.refreshToken)
    if not uid:
        raise HTTPException(status_code=401, detail="invalid refresh token")
    user = db.get(User, uid)
    if not user:
        raise HTTPException(status_code=401, detail="user not found")
    return {"accessToken": make_access(user.id)}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return UserOut.model_validate(user)
