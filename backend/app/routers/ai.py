from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func
from ..db import get_db
from ..models import Task, Subtask, User, TaskStatus
from ..schemas import AiSplitIn, AiEstimateIn, SubtaskOut
from ..deps import current_user
from ..services import ai as ai_svc
from ..ids import cuid

router = APIRouter(prefix="/api/ai", tags=["ai"])


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
