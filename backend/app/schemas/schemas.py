from datetime import datetime
from typing import Any, Dict, Literal, List, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


# ─── AUTH ─────────────────────────────────────────────────────────────────────

AGE_RANGE_OPTIONS = ("0-16", "17-30", "30-50", "50-65", "65+")
AgeRange = Literal["0-16", "17-30", "30-50", "50-65", "65+"]

TRANSPORT_OPTIONS = ("Coche", "Moto", "Tren", "Autobús", "Bici", "Andando")
Transport = Literal["Coche", "Moto", "Tren", "Autobús", "Bici", "Andando"]

HOUSING_OPTIONS = ("Chalet", "Piso")
Housing = Literal["Chalet", "Piso"]

FLOOR_OPTIONS = ("1º", "2º", "3º", "4º", "5º", "6º+")
Floor = Literal["1º", "2º", "3º", "4º", "5º", "6º+"]

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
    mobility_issue: Optional[bool] = None
    vision_issue: Optional[bool] = None
    preferred_transport: Optional[str] = None
    housing_type: Optional[str] = None
    housing_floor: Optional[str] = None
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
    mobility_issue: Optional[bool] = None
    vision_issue: Optional[bool] = None
    preferred_transport: Optional[Transport] = None
    housing_type: Optional[Housing] = None
    housing_floor: Optional[Floor] = None


# ─── WEATHER ──────────────────────────────────────────────────────────────────

class WeatherResponse(BaseModel):
    weather_data: Dict[str, Any]
    llm_response: str
    avatar_state: str
    record_id: Optional[int] = None
    target_day_offset: int = 0
    target_date: Optional[str] = None


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
