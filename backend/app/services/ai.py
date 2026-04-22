import hashlib
import json
from datetime import datetime, timedelta
from typing import Callable, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from ..models import AiCache, AiUsage, Task
from ..ids import cuid
from ..config import settings


ChatFn = Callable[[str], str]

_chat_impl: Optional[ChatFn] = None


def _default_chat(prompt: str) -> str:
    from mistralai import Mistral
    client = Mistral(api_key=settings.MISTRAL_API_KEY)
    resp = client.chat.complete(
        model=settings.MISTRAL_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content


def set_chat_impl(fn: Optional[ChatFn]):
    global _chat_impl
    _chat_impl = fn


def _chat(prompt: str) -> str:
    return (_chat_impl or _default_chat)(prompt)


def _hash(prompt: str) -> str:
    return hashlib.sha256(prompt.encode()).hexdigest()


def _cache_get(db: Session, key: str) -> Optional[Any]:
    c = db.execute(select(AiCache).where(AiCache.key == key)).scalar_one_or_none()
    return c.payload if c else None


def _cache_put(db: Session, key: str, kind: str, payload: Any):
    db.add(AiCache(id=cuid(), key=key, kind=kind, payload=payload))
    db.commit()


def enforce_rate_limit(db: Session, user_id: str):
    day_ago = datetime.utcnow() - timedelta(hours=24)
    n = db.execute(
        select(func.count(AiUsage.id)).where(AiUsage.userId == user_id, AiUsage.createdAt >= day_ago)
    ).scalar_one()
    if n >= settings.AI_DAILY_LIMIT:
        raise ValueError(f"AI daily limit reached ({settings.AI_DAILY_LIMIT})")


def record_usage(db: Session, user_id: str, kind: str):
    db.add(AiUsage(id=cuid(), userId=user_id, kind=kind))
    db.commit()


def _parse_json(raw: str) -> Any:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


def split_task(db: Session, user_id: str, task: Task) -> list[dict]:
    prompt = (
        f"Split this task into 3-8 ordered subtasks. Return JSON {{\"subtasks\":[{{\"title\":\"…\",\"estimateHours\":1.5}}]}}.\n"
        f"Title: {task.title}\nDescription: {task.description or ''}"
    )
    key = _hash("split:" + prompt)
    cached = _cache_get(db, key)
    if cached:
        return cached["subtasks"]
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    subs = data.get("subtasks", [])
    if not isinstance(subs, list) or not subs:
        raise ValueError("AI returned no subtasks")
    cleaned = [
        {"title": str(s.get("title", "")).strip(),
         "estimateHours": float(s["estimateHours"]) if s.get("estimateHours") is not None else None}
        for s in subs if s.get("title")
    ]
    _cache_put(db, key, "split", {"subtasks": cleaned})
    record_usage(db, user_id, "split")
    return cleaned


def estimate_task(db: Session, user_id: str, task: Task) -> list[dict]:
    sub_titles = [s.title for s in task.subtasks]
    prompt = (
        f"Estimate hours for each subtask. Return JSON {{\"estimates\":[{{\"title\":\"…\",\"hours\":1.5}}]}}.\n"
        f"Parent: {task.title}\nSubtasks: {json.dumps(sub_titles)}"
    )
    key = _hash("estimate:" + prompt)
    cached = _cache_get(db, key)
    if cached:
        return cached["estimates"]
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    ests = data.get("estimates", [])
    cleaned = [{"title": e.get("title"), "hours": float(e.get("hours", 1))} for e in ests]
    _cache_put(db, key, "estimate", {"estimates": cleaned})
    record_usage(db, user_id, "estimate")
    return cleaned


def prioritize(db: Session, user_id: str, tasks: list[Task]) -> list[str]:
    items = [
        {"id": t.id, "title": t.title, "priority": t.priority.value if hasattr(t.priority, 'value') else t.priority,
         "dueDate": t.dueDate.isoformat() if t.dueDate else None, "status": t.status.value if hasattr(t.status, 'value') else t.status}
        for t in tasks
    ]
    prompt = (
        "Reorder these tasks by urgency+importance. Return JSON {\"order\":[\"id\",\"id\",…]}.\n"
        f"Tasks: {json.dumps(items)}"
    )
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    order = data.get("order", [])
    valid = {t.id for t in tasks}
    order = [i for i in order if i in valid]
    for t in tasks:
        if t.id not in order:
            order.append(t.id)
    record_usage(db, user_id, "prioritize")
    return order
