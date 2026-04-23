import hashlib
import json
from datetime import datetime, timedelta
from typing import Callable, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from ..models import AiCache, AiUsage, Task, User, Preferences
from ..ids import cuid
from ..config import settings


ChatFn = Callable[[str], str]

_chat_impl: Optional[ChatFn] = None


def _puter_client():
    from openai import OpenAI
    return OpenAI(
        base_url="https://api.puter.com/puterai/openai/v1/",
        api_key=settings.PUTER_API_KEY,
    )


def _default_chat(prompt: str) -> str:
    if settings.PUTER_API_KEY:
        resp = _puter_client().chat.completions.create(
            model=settings.PUTER_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return resp.choices[0].message.content or ""
    from mistralai import Mistral
    client = Mistral(api_key=settings.MISTRAL_API_KEY)
    resp = client.chat.complete(
        model=settings.MISTRAL_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content


def _chat_vision(prompt: str, image_b64: str, mime_type: str = "image/jpeg") -> str:
    """Vision call — requires Puter (gpt-4o-mini supports images)."""
    if not settings.PUTER_API_KEY:
        raise ValueError("Vision requires PUTER_API_KEY")
    resp = _puter_client().chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_b64}"}},
        ]}],
        response_format={"type": "json_object"},
    )
    return resp.choices[0].message.content or ""


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


_LANG_NAMES = {"en": "English", "ru": "Russian", "es": "Spanish"}


def _user_lang(db: Session, user_id: str) -> str:
    p = db.execute(select(Preferences).where(Preferences.userId == user_id)).scalar_one_or_none()
    return p.language if p else "en"


def _lang_instruction(lang: str) -> str:
    name = _LANG_NAMES.get(lang, "English")
    return f"Respond entirely in {name}. All text values in JSON must be in {name}."


def _usage_today(db: Session, user_id: str) -> int:
    day_ago = datetime.utcnow() - timedelta(hours=24)
    return db.execute(
        select(func.count(AiUsage.id)).where(AiUsage.userId == user_id, AiUsage.createdAt >= day_ago)
    ).scalar_one()


def enforce_rate_limit(db: Session, user_id: str):
    user = db.get(User, user_id)
    if user and user.isPremium:
        return
    n = _usage_today(db, user_id)
    if n >= settings.AI_DAILY_LIMIT:
        raise ValueError(f"daily_limit_reached:{settings.AI_DAILY_LIMIT}")


def record_usage(db: Session, user_id: str, kind: str):
    db.add(AiUsage(id=cuid(), userId=user_id, kind=kind))
    db.commit()
    user = db.get(User, user_id)
    if user:
        from . import gamification
        gamification.on_ai_used(db, user)


def get_quota(db: Session, user_id: str) -> dict:
    user = db.get(User, user_id)
    if user and user.isPremium:
        return {"isPremium": True, "used": _usage_today(db, user_id), "limit": None}
    used = _usage_today(db, user_id)
    return {"isPremium": False, "used": used, "limit": settings.AI_DAILY_LIMIT, "remaining": max(0, settings.AI_DAILY_LIMIT - used)}


def _parse_json(raw: str) -> Any:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


def split_task(db: Session, user_id: str, task: Task) -> list[dict]:
    lang = _user_lang(db, user_id)
    prompt = (
        f"{_lang_instruction(lang)}\n"
        f"Split this task into 3-8 ordered subtasks. Return JSON {{\"subtasks\":[{{\"title\":\"…\",\"estimateHours\":1.5}}]}}.\n"
        f"Title: {task.title}\nDescription: {task.description or ''}"
    )
    key = _hash(f"split:{lang}:" + prompt)
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
    lang = _user_lang(db, user_id)
    sub_titles = [s.title for s in task.subtasks]
    prompt = (
        f"{_lang_instruction(lang)}\n"
        f"Estimate hours for each subtask. Return JSON {{\"estimates\":[{{\"title\":\"…\",\"hours\":1.5}}]}}.\n"
        f"Parent: {task.title}\nSubtasks: {json.dumps(sub_titles)}"
    )
    key = _hash(f"estimate:{lang}:" + prompt)
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


def parse_task_text(db: Session, user_id: str, text: str) -> dict:
    lang = _user_lang(db, user_id)
    prompt = (
        f"{_lang_instruction(lang)}\n"
        "Extract task info from user text. Return JSON "
        "{\"title\":\"…\",\"dueDate\":\"YYYY-MM-DD or null\",\"priority\":\"LOW|MEDIUM|HIGH|URGENT\",\"confidence\":0.0-1.0}. "
        f"Today is {datetime.utcnow().date().isoformat()}. "
        f"Text: {text}"
    )
    key = _hash(f"parse:{lang}:" + prompt)
    cached = _cache_get(db, key)
    if cached:
        return cached
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    result = {
        "title": str(data.get("title") or "").strip() or text[:200],
        "dueDate": data.get("dueDate") or None,
        "priority": data.get("priority") if data.get("priority") in ("LOW", "MEDIUM", "HIGH", "URGENT") else None,
        "confidence": float(data.get("confidence") or 0.5),
    }
    _cache_put(db, key, "parse", result)
    record_usage(db, user_id, "parse")
    return result


def extract_tags(db: Session, user_id: str, text: str) -> dict:
    lang = _user_lang(db, user_id)
    prompt = (
        f"{_lang_instruction(lang)}\n"
        "Extract 2-5 short lowercase tags (single words, kebab-case) that categorize this task. "
        "Return JSON {\"tags\":[\"tag1\",\"tag2\"],\"confidence\":0.0-1.0}. "
        f"Text: {text}"
    )
    key = _hash(f"tags:{lang}:" + prompt)
    cached = _cache_get(db, key)
    if cached:
        return cached
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    tags = [str(t).strip().lower()[:30] for t in (data.get("tags") or []) if t][:5]
    result = {"tags": tags, "confidence": float(data.get("confidence") or 0.5)}
    _cache_put(db, key, "tags", result)
    record_usage(db, user_id, "tags")
    return result


def analyze_patterns(db: Session, user_id: str, tasks: list[Task]) -> dict:
    lang = _user_lang(db, user_id)
    sample = [
        {"title": t.title, "status": t.status.value if hasattr(t.status, "value") else t.status,
         "priority": t.priority.value if hasattr(t.priority, "value") else t.priority,
         "tags": list(t.tags or []),
         "createdAt": t.createdAt.isoformat() if t.createdAt else None,
         "completedEstimate": sum((s.estimateHours or 0) for s in (t.subtasks or []))}
        for t in tasks[:50]
    ]
    prompt = (
        f"{_lang_instruction(lang)}\n"
        "Analyze user task history. Return JSON "
        "{\"patterns\":[{\"category\":\"…\",\"avgHours\":1.5,\"count\":3}],"
        "\"insights\":[\"…\"],\"prediction\":{\"hours\":2.0,\"confidence\":0.7}}.\n"
        f"Tasks: {json.dumps(sample)}"
    )
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    record_usage(db, user_id, "patterns")
    return {
        "patterns": data.get("patterns") or [],
        "insights": [str(i) for i in (data.get("insights") or [])][:10],
        "prediction": data.get("prediction") or {"hours": 0, "confidence": 0},
    }


def coach_insights(db: Session, user_id: str, tasks: list[Task]) -> dict:
    lang = _user_lang(db, user_id)
    sample = [
        {"title": t.title, "status": t.status.value if hasattr(t.status, "value") else t.status,
         "priority": t.priority.value if hasattr(t.priority, "value") else t.priority,
         "dueDate": t.dueDate.isoformat() if t.dueDate else None,
         "tags": list(t.tags or [])}
        for t in tasks[:50]
    ]
    prompt = (
        f"{_lang_instruction(lang)}\n"
        "You are a productivity coach. Analyze user state and produce 3-5 actionable insights. "
        "Return JSON {\"insights\":[{\"type\":\"…\",\"message\":\"…\",\"recommendation\":\"…\"}]}.\n"
        f"Tasks: {json.dumps(sample)}"
    )
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    record_usage(db, user_id, "coach")
    items = data.get("insights") or []
    return {"insights": [
        {"type": str(i.get("type", "tip")), "message": str(i.get("message", "")), "recommendation": str(i.get("recommendation", ""))}
        for i in items if i.get("message")
    ][:5]}


def weekly_report(db: Session, user_id: str, tasks_week: list[Task]) -> dict:
    lang = _user_lang(db, user_id)
    done = [t for t in tasks_week if (t.status.value if hasattr(t.status, "value") else t.status) == "DONE"]
    in_prog = [t for t in tasks_week if (t.status.value if hasattr(t.status, "value") else t.status) == "IN_PROGRESS"]
    todo = [t for t in tasks_week if (t.status.value if hasattr(t.status, "value") else t.status) == "TODO"]
    summary = {
        "done": len(done),
        "inProgress": len(in_prog),
        "todo": len(todo),
        "topTasks": [{"title": t.title, "priority": t.priority.value if hasattr(t.priority, "value") else t.priority}
                     for t in done[:5]],
    }
    prompt = (
        f"{_lang_instruction(lang)}\n"
        "Generate 3 short recommendations for the upcoming week based on this summary. "
        "Return JSON {\"recommendations\":[\"…\"]}.\n"
        f"Summary: {json.dumps(summary)}"
    )
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    record_usage(db, user_id, "weekly")
    return {"summary": summary, "recommendations": [str(r) for r in (data.get("recommendations") or [])][:5]}


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


def parse_voice(db: Session, user_id: str, text: str) -> dict:
    """Parse voice transcript — may contain multiple actions → title + subtasks + date + priority."""
    lang = _user_lang(db, user_id)
    prompt = (
        f"{_lang_instruction(lang)}\n"
        f"Today is {datetime.utcnow().date().isoformat()}. "
        "Parse this voice input into a task with optional subtasks. "
        "Return JSON {\"title\":\"…\",\"dueDate\":\"YYYY-MM-DD or null\",\"priority\":\"LOW|MEDIUM|HIGH|URGENT\","
        "\"subtasks\":[\"…\"],\"confidence\":0.0-1.0}. "
        "Extract subtasks only if the text clearly lists multiple distinct actions.\n"
        f"Voice: {text}"
    )
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    record_usage(db, user_id, "parse_voice")
    return {
        "title": str(data.get("title") or "").strip() or text[:200],
        "dueDate": data.get("dueDate") or None,
        "priority": data.get("priority") if data.get("priority") in ("LOW", "MEDIUM", "HIGH", "URGENT") else "MEDIUM",
        "subtasks": [str(s).strip() for s in (data.get("subtasks") or []) if s][:10],
        "confidence": float(data.get("confidence") or 0.7),
    }


def check_complexity(db: Session, user_id: str, title: str, description: str = "") -> dict:
    lang = _user_lang(db, user_id)
    prompt = (
        f"{_lang_instruction(lang)}\n"
        "Decide if this task is complex enough to split into subtasks. "
        "Return JSON {\"isComplex\":true,\"reason\":\"…\",\"confidence\":0.0-1.0}.\n"
        f"Title: {title}\nDescription: {description or ''}"
    )
    key = _hash(f"complexity:{lang}:{title}:{description}")
    cached = _cache_get(db, key)
    if cached:
        return cached
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    result = {
        "isComplex": bool(data.get("isComplex")),
        "reason": str(data.get("reason", "")).strip(),
        "confidence": float(data.get("confidence") or 0.5),
    }
    _cache_put(db, key, "complexity", result)
    record_usage(db, user_id, "complexity")
    return result


def suggest_tasks(db: Session, user_id: str, tasks: list[Task]) -> dict:
    lang = _user_lang(db, user_id)
    sample = [{"title": t.title, "tags": list(t.tags or []),
               "status": t.status.value if hasattr(t.status, "value") else t.status}
              for t in tasks[:40]]
    prompt = (
        f"{_lang_instruction(lang)}\n"
        "Based on user task history, suggest 3-5 new tasks they likely need. "
        "Return JSON {\"suggestions\":[{\"title\":\"…\",\"priority\":\"LOW|MEDIUM|HIGH|URGENT\",\"reason\":\"…\"}]}.\n"
        f"History: {json.dumps(sample)}"
    )
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    record_usage(db, user_id, "suggest")
    items = data.get("suggestions") or []
    return {"suggestions": [
        {"title": str(s.get("title", "")),
         "priority": s.get("priority") if s.get("priority") in ("LOW", "MEDIUM", "HIGH", "URGENT") else "MEDIUM",
         "reason": str(s.get("reason", ""))}
        for s in items if s.get("title")
    ][:5]}


def predict_time(db: Session, user_id: str, title: str, description: str, history: list[Task]) -> dict:
    lang = _user_lang(db, user_id)
    similar = [{"title": t.title,
                "hours": sum((s.estimateHours or 0) for s in (t.subtasks or [])),
                "status": t.status.value if hasattr(t.status, "value") else t.status}
               for t in history[:30]]
    prompt = (
        f"{_lang_instruction(lang)}\n"
        "Predict how many hours this new task will take based on history. "
        "Return JSON {\"hours\":2.5,\"confidence\":0.0-1.0,\"basedOn\":\"…\"}.\n"
        f"New task: {title}\n{description or ''}\n"
        f"History: {json.dumps(similar)}"
    )
    key = _hash(f"predict_time:{lang}:{title}:{description}")
    cached = _cache_get(db, key)
    if cached:
        return cached
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    result = {
        "hours": float(data.get("hours") or 1.0),
        "confidence": float(data.get("confidence") or 0.5),
        "basedOn": str(data.get("basedOn", "")).strip(),
    }
    _cache_put(db, key, "predict_time", result)
    record_usage(db, user_id, "predict_time")
    return result


def deadline_risk(db: Session, user_id: str, tasks: list[Task]) -> dict:
    lang = _user_lang(db, user_id)
    now = datetime.utcnow()
    items = [
        {"id": t.id, "title": t.title,
         "status": t.status.value if hasattr(t.status, "value") else t.status,
         "priority": t.priority.value if hasattr(t.priority, "value") else t.priority,
         "dueDate": t.dueDate.isoformat() if t.dueDate else None,
         "daysLeft": (t.dueDate - now).days if t.dueDate else None,
         "subtasksDone": sum(1 for s in (t.subtasks or []) if s.completed),
         "subtasksTotal": len(t.subtasks or [])}
        for t in tasks if (t.status.value if hasattr(t.status, "value") else t.status) != "DONE"
    ]
    if not items:
        return {"risks": []}
    prompt = (
        f"{_lang_instruction(lang)}\n"
        f"Today is {now.date().isoformat()}. Analyze which tasks are at risk of missing deadline. "
        "Return JSON {\"risks\":[{\"id\":\"…\",\"risk\":\"high|medium|low\",\"reason\":\"…\"}]}.\n"
        f"Tasks: {json.dumps(items)}"
    )
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    record_usage(db, user_id, "deadline_risk")
    valid_ids = {t["id"] for t in items}
    risks = [
        {"id": r.get("id"), "risk": r.get("risk", "low"), "reason": str(r.get("reason", ""))}
        for r in (data.get("risks") or [])
        if r.get("id") in valid_ids and r.get("risk") in ("high", "medium", "low")
    ]
    return {"risks": risks}


def generate_smart_goals(db: Session, user_id: str, title: str, description: str = "") -> dict:
    lang = _user_lang(db, user_id)
    prompt = (
        f"{_lang_instruction(lang)}\n"
        "Transform this task into a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound). "
        "Return JSON {\"smart\":{\"specific\":\"…\",\"measurable\":\"…\",\"achievable\":\"…\",\"relevant\":\"…\",\"timeBound\":\"…\"},\"goal\":\"…\",\"dueDate\":\"YYYY-MM-DD or null\"}.\n"
        f"Today is {datetime.utcnow().date().isoformat()}.\n"
        f"Task: {title}\nDescription: {description or ''}"
    )
    key = _hash(f"smart:{lang}:{title}:{description}")
    cached = _cache_get(db, key)
    if cached:
        return cached
    enforce_rate_limit(db, user_id)
    raw = _chat(prompt)
    data = _parse_json(raw)
    smart = data.get("smart") or {}
    result = {
        "smart": {
            "specific": str(smart.get("specific", "")),
            "measurable": str(smart.get("measurable", "")),
            "achievable": str(smart.get("achievable", "")),
            "relevant": str(smart.get("relevant", "")),
            "timeBound": str(smart.get("timeBound", "")),
        },
        "goal": str(data.get("goal", title)),
        "dueDate": data.get("dueDate") or None,
    }
    _cache_put(db, key, "smart", result)
    record_usage(db, user_id, "smart")
    return result


def ocr_image(db: Session, user_id: str, image_b64: str, mime_type: str = "image/jpeg") -> dict:
    lang = _user_lang(db, user_id)
    prompt = (
        f"{_lang_instruction(lang)}\n"
        "Extract all tasks/todos visible in this image (whiteboard, note, list). "
        "Mark items with checkmark/strikethrough as DONE, rest as TODO. "
        "Return JSON {\"tasks\":[{\"title\":\"…\",\"status\":\"TODO|DONE\"}]}."
    )
    enforce_rate_limit(db, user_id)
    raw = _chat_vision(prompt, image_b64, mime_type)
    data = _parse_json(raw)
    record_usage(db, user_id, "ocr")
    items = data.get("tasks") or []
    return {"tasks": [
        {"title": str(t.get("title", "")).strip()[:200],
         "status": t.get("status") if t.get("status") in ("TODO", "DONE") else "TODO"}
        for t in items if t.get("title")
    ]}
