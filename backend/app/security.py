from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt, JWTError
from .config import settings

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(p: str) -> str:
    return pwd.hash(p)


def verify_password(p: str, h: str) -> bool:
    return pwd.verify(p, h)


def _make_token(sub: str, secret: str, minutes: int) -> str:
    now = datetime.now(tz=timezone.utc)
    payload = {"sub": sub, "iat": int(now.timestamp()), "exp": int((now + timedelta(minutes=minutes)).timestamp())}
    return jwt.encode(payload, secret, algorithm="HS256")


def make_access(user_id: str) -> str:
    return _make_token(user_id, settings.JWT_ACCESS_SECRET, settings.JWT_ACCESS_TTL_MIN)


def make_refresh(user_id: str) -> str:
    return _make_token(user_id, settings.JWT_REFRESH_SECRET, settings.JWT_REFRESH_TTL_DAYS * 24 * 60)


def decode(token: str, secret: str) -> str | None:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload.get("sub")
    except JWTError:
        return None


def decode_access(token: str) -> str | None:
    return decode(token, settings.JWT_ACCESS_SECRET)


def decode_refresh(token: str) -> str | None:
    return decode(token, settings.JWT_REFRESH_SECRET)
