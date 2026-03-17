from datetime import datetime
from typing import Any, Dict, Literal, List, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


# ─── AUTH ─────────────────────────────────────────────────────────────────────

AGE_RANGE_OPTIONS = ("0-16", "17-30", "30-50", "50-65", "65+")
AgeRange = Literal["0-16", "17-30", "30-50", "50-65", "65+"]

class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    confirm_password: str = Field(min_length=6, max_length=128)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")
        return self


class UserLogin(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str]
    age_range: Optional[AgeRange] = None
    avatar_state: str
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class AvatarUpdate(BaseModel):
    avatar_state: str


class ProfileUpdate(BaseModel):
    age_range: AgeRange


# ─── WEATHER ──────────────────────────────────────────────────────────────────

class WeatherResponse(BaseModel):
    weather_data: Dict[str, Any]
    llm_response: str
    avatar_state: str
    record_id: Optional[int] = None


class WeatherRecordOut(BaseModel):
    id: int
    user_id: Optional[int]
    weather_data: Dict[str, Any]
    llm_response: Optional[str]
    avatar_state: Optional[str]
    is_disaster: bool
    temperature: Optional[float]
    humidity: Optional[float]
    wind_speed: Optional[float]
    description: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── ALERTS ───────────────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    title: str
    message: str
    severity: str = "info"
    expires_at: Optional[datetime] = None


class AlertUpdate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


class AlertOut(BaseModel):
    id: int
    title: str
    message: str
    severity: str
    is_active: bool
    created_by: str
    created_at: datetime
    expires_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ─── EMERGENCY ────────────────────────────────────────────────────────────────

class EmergencyBroadcastOut(BaseModel):
    id: int
    llm_message: str
    triggered_by: str
    recipients_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── ADMIN ────────────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    password: str
