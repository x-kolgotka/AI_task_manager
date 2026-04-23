from typing import Optional
from ..config import settings


_sent: list[dict] = []


def sent_log() -> list[dict]:
    return list(_sent)


def _clear():
    _sent.clear()


def send_email(to: str, subject: str, html: str, text: Optional[str] = None) -> None:
    """Dev stub: appends to _sent log and prints. Production would use aiosmtplib."""
    entry = {"to": to, "subject": subject, "html": html, "text": text or ""}
    _sent.append(entry)
    if settings.APP_ENV != "test":
        print(f"[EMAIL] to={to} subject={subject!r}")
