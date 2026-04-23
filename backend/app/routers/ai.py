from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func
from ..db import get_db
from ..models import Task, Subtask, User, TaskStatus
from ..schemas import AiSplitIn, AiEstimateIn, SubtaskOut, AiParseTextIn, AiExtractTagsIn
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from ..deps import current_user
from ..services import ai as ai_svc
from ..ids import cuid

router = APIRouter(prefix="/api/ai", tags=["ai"])


class CheckComplexityIn(BaseModel):
    title: str
    description: Optional[str] = ""


class PredictTimeIn(BaseModel):
    title: str
    description: Optional[str] = ""


class OcrIn(BaseModel):
    imageBase64: str
    mimeType: str = "image/jpeg"


class SmartIn(BaseModel):
    title: str
    description: Optional[str] = ""


def _owned(db: Session, user: User, task_id: str) -> Task:
    t = db.execute(
        select(Task).where(Task.id == task_id, Task.userId == user.id).options(selectinload(Task.subtasks))
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="task not found")
    return t


@router.post("/split")
def split(body: AiSplitIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _owned(db, user, body.taskId)
    try:
        subs = ai_svc.split_task(db, user.id, t)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))
    created = []
    if body.apply:
        max_pos = db.execute(select(func.max(Subtask.position)).where(Subtask.taskId == t.id)).scalar() or 0
        for i, s in enumerate(subs):
            row = Subtask(
                id=cuid(), taskId=t.id, title=s["title"],
                estimateHours=s.get("estimateHours"), position=max_pos + 1 + i,
            )
            db.add(row)
            created.append(row)
        db.commit()
        for r in created:
            db.refresh(r)
        return {"subtasks": [SubtaskOut.model_validate(r).model_dump(mode="json") for r in created], "applied": True}
    return {"subtasks": subs, "applied": False}


@router.post("/estimate")
def estimate(body: AiEstimateIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _owned(db, user, body.taskId)
    try:
        ests = ai_svc.estimate_task(db, user.id, t)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))
    by_title = {e["title"]: e["hours"] for e in ests if e.get("title")}
    for s in t.subtasks:
        if s.title in by_title:
            s.estimateHours = by_title[s.title]
    db.commit()
    db.refresh(t)
    return {"estimates": ests, "subtasks": [SubtaskOut.model_validate(s).model_dump(mode="json") for s in t.subtasks]}


@router.post("/prioritize")
def prioritize(user: User = Depends(current_user), db: Session = Depends(get_db)):
    tasks = db.execute(
        select(Task).where(Task.userId == user.id, Task.status != TaskStatus.DONE)
    ).scalars().all()
    if len(tasks) < 2:
        raise HTTPException(status_code=400, detail="need at least 2 tasks")
    try:
        order = ai_svc.prioritize(db, user.id, list(tasks))
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))
    return {"order": order}


@router.post("/parse-text")
def parse_text(body: AiParseTextIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return ai_svc.parse_task_text(db, user.id, body.text)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.post("/extract-tags")
def extract_tags(body: AiExtractTagsIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return ai_svc.extract_tags(db, user.id, body.text)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.get("/patterns")
def patterns(user: User = Depends(current_user), db: Session = Depends(get_db)):
    tasks = db.execute(
        select(Task).where(Task.userId == user.id).options(selectinload(Task.subtasks)).order_by(Task.createdAt.desc()).limit(50)
    ).scalars().all()
    if len(tasks) < 3:
        return {"patterns": [], "insights": [], "prediction": {"hours": 0, "confidence": 0}}
    try:
        return ai_svc.analyze_patterns(db, user.id, list(tasks))
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.get("/coach")
def coach(user: User = Depends(current_user), db: Session = Depends(get_db)):
    tasks = db.execute(
        select(Task).where(Task.userId == user.id).order_by(Task.createdAt.desc()).limit(50)
    ).scalars().all()
    if len(tasks) < 3:
        return {"insights": []}
    try:
        return ai_svc.coach_insights(db, user.id, list(tasks))
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.post("/import-text")
def import_text(body: AiParseTextIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Parse OCR/paste text into multiple task drafts (one per non-empty line, strip checkbox markers)."""
    import re
    lines = [ln.strip() for ln in (body.text or "").splitlines() if ln.strip()]
    drafts = []
    for ln in lines:
        done = bool(re.match(r"^\[\s*[xX]\s*\]", ln))
        cleaned = re.sub(r"^[-*\[\]xX\s\.\d\)]+", "", ln).strip()
        if cleaned:
            drafts.append({"title": cleaned[:200], "status": "DONE" if done else "TODO"})
    return {"drafts": drafts}


@router.post("/parse-voice")
def parse_voice(body: AiParseTextIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return ai_svc.parse_voice(db, user.id, body.text)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.post("/check-complexity")
def check_complexity(body: CheckComplexityIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return ai_svc.check_complexity(db, user.id, body.title, body.description or "")
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.get("/suggest-tasks")
def suggest_tasks(user: User = Depends(current_user), db: Session = Depends(get_db)):
    tasks = db.execute(
        select(Task).where(Task.userId == user.id).order_by(Task.createdAt.desc()).limit(40)
    ).scalars().all()
    if len(tasks) < 3:
        return {"suggestions": []}
    try:
        return ai_svc.suggest_tasks(db, user.id, list(tasks))
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.post("/predict-time")
def predict_time(body: PredictTimeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    history = db.execute(
        select(Task).where(Task.userId == user.id, Task.status == TaskStatus.DONE)
        .options(selectinload(Task.subtasks)).order_by(Task.updatedAt.desc()).limit(30)
    ).scalars().all()
    try:
        return ai_svc.predict_time(db, user.id, body.title, body.description or "", list(history))
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.get("/deadline-risk")
def get_deadline_risk(user: User = Depends(current_user), db: Session = Depends(get_db)):
    tasks = db.execute(
        select(Task).where(Task.userId == user.id, Task.status != TaskStatus.DONE)
        .options(selectinload(Task.subtasks))
    ).scalars().all()
    if not tasks:
        return {"risks": []}
    try:
        return ai_svc.deadline_risk(db, user.id, list(tasks))
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.get("/stuck-tasks")
def get_stuck_tasks(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Tasks IN_PROGRESS with no update for 7+ days."""
    week_ago = datetime.utcnow() - timedelta(days=7)
    tasks = db.execute(
        select(Task).where(
            Task.userId == user.id,
            Task.status == TaskStatus.IN_PROGRESS,
            Task.updatedAt <= week_ago,
        )
    ).scalars().all()
    return {"tasks": [{"id": t.id, "title": t.title, "daysSinceUpdate": (datetime.utcnow() - t.updatedAt).days} for t in tasks]}


@router.post("/smart-goal")
def smart_goal(body: SmartIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return ai_svc.generate_smart_goals(db, user.id, body.title, body.description or "")
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.post("/ocr")
def ocr(body: OcrIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    try:
        return ai_svc.ocr_image(db, user.id, body.imageBase64, body.mimeType)
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))


@router.get("/weekly-report")
def weekly(user: User = Depends(current_user), db: Session = Depends(get_db)):
    week_ago = datetime.utcnow() - timedelta(days=7)
    tasks = db.execute(
        select(Task).where(Task.userId == user.id, Task.updatedAt >= week_ago)
    ).scalars().all()
    try:
        return ai_svc.weekly_report(db, user.id, list(tasks))
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))
