import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import Task, User
from ..deps import current_user


router = APIRouter(prefix="/api/search", tags=["search"])


_TOKEN_RE = re.compile(r"[a-zA-Zа-яА-Я0-9]+", re.UNICODE)


def _tokens(s: str) -> set[str]:
    return {t.lower() for t in _TOKEN_RE.findall(s or "")}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


class SemanticIn(BaseModel):
    query: str
    limit: int = 10


@router.post("/semantic")
def semantic(body: SemanticIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    q_tokens = _tokens(body.query)
    rows = db.execute(select(Task).where(Task.userId == user.id)).scalars().all()
    scored = []
    for t in rows:
        text = f"{t.title} {t.description or ''} {' '.join(t.tags or [])}"
        sim = _jaccard(q_tokens, _tokens(text))
        if sim > 0:
            scored.append({"id": t.id, "title": t.title, "similarity": round(sim, 3)})
    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return {"results": scored[: body.limit]}
