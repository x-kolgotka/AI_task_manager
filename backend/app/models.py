from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime, Float, ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship
from .db import Base
from .ids import cuid
import enum


class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"


class Priority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


def _now():
    return datetime.utcnow()


class User(Base):
    __tablename__ = "User"
    id = Column(Text, primary_key=True, default=cuid)
    phone = Column(Text, unique=True, nullable=False)
    password = Column(Text, nullable=False)
    phoneVerified = Column(Boolean, nullable=False, default=False)
    fullName = Column(Text)
    avatarUrl = Column(Text)
    bio = Column(Text)
    email = Column(Text)
    emailVerified = Column(Boolean, nullable=False, default=False)
    totpSecret = Column(Text)
    totpEnabled = Column(Boolean, nullable=False, default=False)
    totpBackupCodes = Column(ARRAY(Text), nullable=False, default=list)
    isPremium = Column(Boolean, nullable=False, default=False)
    points = Column(Integer, nullable=False, default=0)
    createdAt = Column(DateTime, nullable=False, default=_now)
    updatedAt = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    sms_codes = relationship("SmsCode", back_populates="user", cascade="all, delete-orphan")
    preferences = relationship("Preferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    ai_usage = relationship("AiUsage", back_populates="user", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="user", cascade="all, delete-orphan")


class SmsCode(Base):
    __tablename__ = "SmsCode"
    id = Column(Text, primary_key=True, default=cuid)
    userId = Column(Text, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    code = Column(Text, nullable=False)
    expiresAt = Column(DateTime, nullable=False)
    consumed = Column(Boolean, nullable=False, default=False)
    sendCount = Column(Integer, nullable=False, default=1)
    createdAt = Column(DateTime, nullable=False, default=_now)

    user = relationship("User", back_populates="sms_codes")


class Task(Base):
    __tablename__ = "Task"
    id = Column(Text, primary_key=True, default=cuid)
    userId = Column(Text, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text)
    status = Column(SAEnum(TaskStatus, name="TaskStatus", create_type=False), nullable=False, default=TaskStatus.TODO)
    priority = Column(SAEnum(Priority, name="Priority", create_type=False), nullable=False, default=Priority.MEDIUM)
    dueDate = Column(DateTime)
    tags = Column(ARRAY(Text), nullable=False, default=list)
    position = Column(Integer, nullable=False, default=0)
    createdAt = Column(DateTime, nullable=False, default=_now)
    updatedAt = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    user = relationship("User", back_populates="tasks")
    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan",
                            order_by="Subtask.position")


class Subtask(Base):
    __tablename__ = "Subtask"
    id = Column(Text, primary_key=True, default=cuid)
    taskId = Column(Text, ForeignKey("Task.id", ondelete="CASCADE"), nullable=False)
    title = Column(Text, nullable=False)
    completed = Column(Boolean, nullable=False, default=False)
    estimateHours = Column(Float)
    position = Column(Integer, nullable=False, default=0)
    createdAt = Column(DateTime, nullable=False, default=_now)
    updatedAt = Column(DateTime, nullable=False, default=_now, onupdate=_now)

    task = relationship("Task", back_populates="subtasks")


class Preferences(Base):
    __tablename__ = "Preferences"
    id = Column(Text, primary_key=True, default=cuid)
    userId = Column(Text, ForeignKey("User.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme = Column(Text, nullable=False, default="light")
    language = Column(Text, nullable=False, default="en")
    timezone = Column(Text, nullable=False, default="UTC")
    timeFormat = Column(Text, nullable=False, default="24h")
    weekStart = Column(Text, nullable=False, default="mon")
    colorScheme = Column(Text, nullable=False, default="blue")
    compactList = Column(Boolean, nullable=False, default=False)
    emailNotify = Column(Boolean, nullable=False, default=True)
    deadlineReminder = Column(Boolean, nullable=False, default=True)
    weeklyReportEmail = Column(Boolean, nullable=False, default=False)
    dailyDigest = Column(Boolean, nullable=False, default=False)

    user = relationship("User", back_populates="preferences")


class Achievement(Base):
    __tablename__ = "Achievement"
    id = Column(Text, primary_key=True, default=cuid)
    userId = Column(Text, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    badge = Column(Text, nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text)
    points = Column(Integer, nullable=False, default=0)
    unlockedAt = Column(DateTime, nullable=False, default=_now)

    user = relationship("User", back_populates="achievements")


class EmailVerification(Base):
    __tablename__ = "EmailVerification"
    id = Column(Text, primary_key=True, default=cuid)
    userId = Column(Text, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    email = Column(Text, nullable=False)
    code = Column(Text, nullable=False)
    expiresAt = Column(DateTime, nullable=False)
    createdAt = Column(DateTime, nullable=False, default=_now)


class TaskComment(Base):
    __tablename__ = "TaskComment"
    id = Column(Text, primary_key=True, default=cuid)
    taskId = Column(Text, ForeignKey("Task.id", ondelete="CASCADE"), nullable=False)
    userId = Column(Text, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    createdAt = Column(DateTime, nullable=False, default=_now)


class AiUsage(Base):
    __tablename__ = "AiUsage"
    id = Column(Text, primary_key=True, default=cuid)
    userId = Column(Text, ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    kind = Column(Text, nullable=False)
    createdAt = Column(DateTime, nullable=False, default=_now)

    user = relationship("User", back_populates="ai_usage")


class AiCache(Base):
    __tablename__ = "AiCache"
    id = Column(Text, primary_key=True, default=cuid)
    key = Column(Text, unique=True, nullable=False)
    kind = Column(Text, nullable=False)
    payload = Column(JSONB, nullable=False)
    createdAt = Column(DateTime, nullable=False, default=_now)
