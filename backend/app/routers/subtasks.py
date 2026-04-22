from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from ..db import get_db
from ..models import Subtask, Task, User
from ..schemas import SubtaskCreate, SubtaskUpdate, SubtaskOut
from ..deps import current_user
from ..ids import cuid

router = APIRouter(tags=["subtasks"])


def _owned_task(db: Session, user: User, task_id: str) -> Task:
    t = db.execute(select(Task).where(Task.id == task_id, Task.userId == user.id)).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="task not found")
    return t


def _owned_subtask(db: Session, user: User, sub_id: str) -> Subtask:
    s = db.execute(
        select(Subtask).join(Task, Subtask.taskId == Task.id)
        .where(Subtask.id == sub_id, Task.userId == user.id)
    ).scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="subtask not found")
    return s


@router.post("/api/tasks/{task_id}/subtasks", status_code=201)
def create(task_id: str, body: SubtaskCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _owned_task(db, user, task_id)
    max_pos = db.execute(select(func.max(Subtask.position)).where(Subtask.taskId == task_id)).scalar() or 0
    s = Subtask(
        id=cuid(),
        taskId=task_id,
        title=body.title,
        estimateHours=body.estimateHours,
        position=body.position if body.position is not None else max_pos + 1,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"subtask": SubtaskOut.model_validate(s).model_dump(mode="json")}


@router.put("/api/subtasks/{sub_id}")
def update(sub_id: str, body: SubtaskUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = _owned_subtask(db, user, sub_id)
    data = body.model_dump(exclude_unset=True)
    if "taskId" in data and data["taskId"] and data["taskId"] != s.taskId:
        _owned_task(db, user, data["taskId"])
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    db.refresh(s)
    return {"subtask": SubtaskOut.model_validate(s).model_dump(mode="json")}


@router.delete("/api/subtasks/{sub_id}", status_code=204)
def delete(sub_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = _owned_subtask(db, user, sub_id)
    db.delete(s)
    db.commit()
