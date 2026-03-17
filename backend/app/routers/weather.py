import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, WeatherRecord
from app.routers.user import get_current_user
from app.schemas.schemas import WeatherRecordOut, WeatherResponse
from app.services.prompt_engine import build_weather_user_prompt, get_system_prompt
from app.services.weather_proxy import call_llm, extract_llm_text, get_weather

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/weather", tags=["weather"])


def _extract_scalars(data: dict) -> dict:
    """Pull temperature/humidity/wind/description from whatever shape the API returns."""
    def _f(val):
        try:
            return float(val) if val is not None else None
        except (TypeError, ValueError):
            return None

    temp = _f(
        data.get("temperature")
        or data.get("temp")
        or (data.get("main") or {}).get("temp")
        or (data.get("current") or {}).get("temperature")
    )
    hum = _f(
        data.get("humidity")
        or (data.get("main") or {}).get("humidity")
        or (data.get("current") or {}).get("humidity")
    )
    wind = _f(
        data.get("wind_speed")
        or (data.get("wind") or {}).get("speed")
        or (data.get("current") or {}).get("wind_speed")
    )
    weather_list = data.get("weather") or []
    desc = (
        data.get("description")
        or (weather_list[0].get("description") if weather_list else None)
        or (data.get("current") or {}).get("weather_description")
    )
    return {"temperature": temp, "humidity": hum, "wind_speed": wind, "description": str(desc) if desc else None}


@router.get("/current", response_model=WeatherResponse)
async def get_current_weather(
    avatar_state: str = "energized",
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Fetch live weather + personalized LLM analysis based on avatar state."""
    try:
        weather_data = await get_weather(disaster=False)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Weather API unreachable: {exc}")

    user_name = current_user.username if current_user else "friend"

    # Build history context from last 3 records
    history = []
    if current_user:
        rows = (
            db.query(WeatherRecord)
            .filter(WeatherRecord.user_id == current_user.id)
            .order_by(WeatherRecord.created_at.desc())
            .limit(3)
            .all()
        )
        history = [
            {
                "date": r.created_at.strftime("%Y-%m-%d"),
                "summary": (r.description or "") + (" — " + r.llm_response[:60] if r.llm_response else ""),
            }
            for r in rows
        ]

    system_prompt = get_system_prompt(avatar_state, user_name)
    user_prompt = build_weather_user_prompt(weather_data, avatar_state, history)

    try:
        llm_raw = await call_llm(system_prompt, user_prompt)
        llm_text = extract_llm_text(llm_raw)
    except Exception as exc:
        logger.error(f"LLM unavailable: {exc}")
        llm_text = "⚠️ AI analysis temporarily unavailable. Here is the raw weather data above."

    scalars = _extract_scalars(weather_data)
    record = WeatherRecord(
        user_id=current_user.id if current_user else None,
        weather_data=weather_data,
        llm_response=llm_text,
        avatar_state=avatar_state,
        is_disaster=False,
        **scalars,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return WeatherResponse(
        weather_data=weather_data,
        llm_response=llm_text,
        avatar_state=avatar_state,
        record_id=record.id,
    )


@router.get("/history", response_model=List[WeatherRecordOut])
async def get_weather_history(
    limit: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """7-day weather history for the authenticated user."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Login required")

    records = (
        db.query(WeatherRecord)
        .filter(WeatherRecord.user_id == current_user.id)
        .order_by(WeatherRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return records
