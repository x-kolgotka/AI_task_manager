from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..db import get_db
from ..models import Task, TaskComment, User
from ..deps import current_user
from ..ids import cuid


router = APIRouter(prefix="/api/tasks/{task_id}/comments", tags=["comments"])


class CommentIn(BaseModel):
    text: str


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    taskId: str
    userId: str
    text: str
    createdAt: datetime


def _owned(db: Session, user: User, task_id: str) -> Task:
    t = db.execute(select(Task).where(Task.id == task_id, Task.userId == user.id)).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="task not found")
    return t


@router.get("", response_model=List[CommentOut])
def list_comments(task_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _owned(db, user, task_id)
    rows = db.execute(
        select(TaskComment).where(TaskComment.taskId == task_id).order_by(TaskComment.createdAt.asc())
    ).scalars().all()
    return list(rows)


@router.post("", status_code=201, response_model=CommentOut)
def add_comment(task_id: str, body: CommentIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _owned(db, user, task_id)
    c = TaskComment(id=cuid(), taskId=task_id, userId=user.id, text=body.text)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@router.delete("/{comment_id}", status_code=204)
def delete_comment(task_id: str, comment_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    _owned(db, user, task_id)
    c = db.execute(
        select(TaskComment).where(TaskComment.id == comment_id, TaskComment.taskId == task_id, TaskComment.userId == user.id)
    ).scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="comment not found")
    db.delete(c)
    db.commit()
