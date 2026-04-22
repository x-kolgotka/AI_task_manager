from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict


PhoneStr = str  # +digits, validated manually
Status = Literal["TODO", "IN_PROGRESS", "DONE"]
PriorityT = Literal["LOW", "MEDIUM", "HIGH", "URGENT"]


class RegisterIn(BaseModel):
    phone: str = Field(min_length=8, max_length=20)
    password: str = Field(min_length=8, max_length=100)


class VerifySmsIn(BaseModel):
    phone: str
    code: str = Field(min_length=6, max_length=6)


class ResendSmsIn(BaseModel):
    phone: str


class LoginIn(BaseModel):
    phone: str
    password: str


class RefreshIn(BaseModel):
    refreshToken: str = Field(min_length=10)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    phone: str
    phoneVerified: bool
    fullName: Optional[str] = None
    avatarUrl: Optional[str] = None
    bio: Optional[str] = None


class AuthResponse(BaseModel):
    accessToken: str
    refreshToken: str
    user: UserOut


class SubtaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    taskId: str
    title: str
    completed: bool
    estimateHours: Optional[float] = None
    position: int


class SubtaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    estimateHours: Optional[float] = None
    position: Optional[int] = None


class SubtaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    completed: Optional[bool] = None
    estimateHours: Optional[float] = None
    position: Optional[int] = None
    taskId: Optional[str] = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    description: Optional[str] = None
    status: Status
    priority: PriorityT
    dueDate: Optional[datetime] = None
    tags: List[str] = []
    position: int
    createdAt: datetime
    updatedAt: datetime
    subtasks: List[SubtaskOut] = []


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=10000)
    status: Optional[Status] = None
    priority: Optional[PriorityT] = None
    dueDate: Optional[datetime] = None
    tags: Optional[List[str]] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=10000)
    status: Optional[Status] = None
    priority: Optional[PriorityT] = None
    dueDate: Optional[datetime] = None
    tags: Optional[List[str]] = None
    position: Optional[int] = None


class ReorderIn(BaseModel):
    order: List[str]


class AiSplitIn(BaseModel):
    taskId: str
    apply: Optional[bool] = False


class AiEstimateIn(BaseModel):
    taskId: str
