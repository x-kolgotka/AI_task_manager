from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select, func
from typing import Optional
from ..db import get_db
from ..models import Task, User, TaskStatus, Priority
from ..schemas import TaskOut, TaskCreate, TaskUpdate, ReorderIn
from ..deps import current_user
from ..ids import cuid

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", response_model=dict)
def list_tasks(
    status: Optional[str] = Query(default=None),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    q = select(Task).where(Task.userId == user.id).options(selectinload(Task.subtasks))
    if status and status != "ALL":
        q = q.where(Task.status == TaskStatus(status))
    q = q.order_by(Task.position.asc(), Task.createdAt.desc())
    rows = db.execute(q).scalars().all()
    return {"tasks": [TaskOut.model_validate(t).model_dump(mode="json") for t in rows]}


@router.post("", status_code=201, response_model=dict)
def create_task(body: TaskCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    max_pos = db.execute(select(func.max(Task.position)).where(Task.userId == user.id)).scalar() or 0
    t = Task(
        id=cuid(),
        userId=user.id,
        title=body.title,
        description=body.description,
        status=TaskStatus(body.status) if body.status else TaskStatus.TODO,
        priority=Priority(body.priority) if body.priority else Priority.MEDIUM,
        dueDate=body.dueDate,
        tags=body.tags or [],
        position=max_pos + 1,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return {"task": TaskOut.model_validate(t).model_dump(mode="json")}


def _owned(db: Session, user: User, task_id: str) -> Task:
    t = db.execute(
        select(Task).where(Task.id == task_id, Task.userId == user.id).options(selectinload(Task.subtasks))
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="task not found")
    return t


@router.get("/{task_id}", response_model=dict)
def get_task(task_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _owned(db, user, task_id)
    return {"task": TaskOut.model_validate(t).model_dump(mode="json")}


@router.put("/{task_id}", response_model=dict)
def update_task(task_id: str, body: TaskUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _owned(db, user, task_id)
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = TaskStatus(data["status"])
    if "priority" in data and data["priority"] is not None:
        data["priority"] = Priority(data["priority"])
    for k, v in data.items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return {"task": TaskOut.model_validate(t).model_dump(mode="json")}


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _owned(db, user, task_id)
    db.delete(t)
    db.commit()


@router.post("/reorder", response_model=dict)
def reorder(body: ReorderIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for pos, tid in enumerate(body.order):
        db.execute(
            Task.__table__.update().where(Task.id == tid, Task.userId == user.id).values(position=pos)
        )
    db.commit()
    return {"ok": True}
