import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User, WeatherRecord
from app.routers.user import get_current_user
from app.schemas.schemas import WeatherRecordOut, WeatherResponse
from app.services.prompt_engine import build_weather_user_prompt, get_system_prompt
from app.services.weather_proxy import call_llm, extract_llm_text, get_weather

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/weather", tags=["weather"])

SPANISH_ANALYSIS_RULE = (
    "IDIOMA OBLIGATORIO: responde SIEMPRE en espanol (es-ES). "
    "No uses ingles en el analisis final."
)

ENGLISH_MARKERS = (
    " the ", " and ", " with ", " today ", " weather ", " forecast ",
    " temperature ", " humidity ", " wind ", " recommendation ",
)
SPANISH_MARKERS = (
    " el ", " la ", " los ", " las ", " con ", " hoy ", " clima ",
    " tiempo ", " temperatura ", " humedad ", " viento ",
)

# ─── Simulated weather data per mode ─────────────────────────────────────────
SIMULATED_WEATHER = {
    "rain":   {"temperature": 12, "tmin": 8,  "humidity": 95, "wind_speed": 40,
               "description": "Lluvia fuerte",     "prec": 25},
    "fog":    {"temperature": 10, "tmin": 7,  "humidity": 98, "wind_speed": 5,
               "description": "Niebla densa",      "prec": 2},
    "desert": {"temperature": 42, "tmin": 28, "humidity": 15, "wind_speed": 20,
               "description": "Despejado extremo", "prec": 0},
    "snow":   {"temperature": 1,  "tmin": -3, "humidity": 88, "wind_speed": 15,
               "description": "Nevada",            "prec": 8},
}


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
    return {"temperature": temp, "humidity": hum, "wind_speed": wind,
            "description": str(desc) if desc else None}


def _looks_english(text: str) -> bool:
    if not text or len(text) < 20:
        return False
    normalized = f" {text.lower()} "
    en_score = sum(1 for marker in ENGLISH_MARKERS if marker in normalized)
    es_score = sum(1 for marker in SPANISH_MARKERS if marker in normalized)
    return en_score >= 2 and en_score > es_score


async def _ensure_spanish_analysis(text: str) -> str:
    if not text or not _looks_english(text):
        return text

    translation_system_prompt = (
        "You are a professional translator. "
        "Translate the provided weather analysis to natural Spanish (es-ES). "
        "Preserve Markdown structure, bullets and emojis. Return only the translated text."
    )
    translation_user_prompt = f"Translate this weather analysis to Spanish:\n\n{text}"

    try:
        translated_raw = await call_llm(translation_system_prompt, translation_user_prompt)
        translated_text = extract_llm_text(translated_raw).strip()
        return translated_text or text
    except Exception as exc:
        logger.warning(f"Could not auto-translate analysis to Spanish: {exc}")
        return text


@router.get("/current", response_model=WeatherResponse)
async def get_current_weather(
    avatar_state: str = "energized",
    mode: Optional[str] = None,
    target_day_offset: int = Query(default=0, ge=0, le=3),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """Fetch live weather + personalized LLM analysis based on avatar state.
    mode=rain|fog|desert|snow → use simulated data instead of EC2 API.
    target_day_offset=0..3 selects today or one of the next 3 forecast days.
    """
    target_date = (datetime.now(timezone.utc) + timedelta(days=target_day_offset)).date().isoformat()

    # ── 10-minute cache (only for real/non-simulated requests) ───────────────
    if mode is None and current_user and target_day_offset == 0:
        cutoff = datetime.utcnow() - timedelta(minutes=10)
        cached = (
            db.query(WeatherRecord)
            .filter(
                WeatherRecord.user_id == current_user.id,
                WeatherRecord.is_disaster == False,  # noqa: E712
                WeatherRecord.created_at >= cutoff,
            )
            .order_by(WeatherRecord.created_at.desc())
            .first()
        )
        if cached:
            logger.info(f"Returning cached weather record {cached.id} for user {current_user.id}")
            cached_llm = await _ensure_spanish_analysis(cached.llm_response or "")
            if cached_llm != (cached.llm_response or ""):
                cached.llm_response = cached_llm
                db.add(cached)
                db.commit()
                db.refresh(cached)
            return WeatherResponse(
                weather_data=cached.weather_data,
                llm_response=cached_llm,
                avatar_state=cached.avatar_state or avatar_state,
                record_id=cached.id,
                target_day_offset=0,
                target_date=datetime.now(timezone.utc).date().isoformat(),
            )

    # ── Fetch or select weather data ─────────────────────────────────────────
    if mode and mode in SIMULATED_WEATHER:
        weather_data = SIMULATED_WEATHER[mode]
        logger.info(f"Using simulated weather mode: {mode}")
    else:
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

    if target_day_offset == 0:
        forecast_target_rule = "CONTEXTO DE FECHA: la previsión es para HOY."
    else:
        forecast_target_rule = (
            f"CONTEXTO DE FECHA: la previsión es para {target_date} "
            f"(dentro de {target_day_offset} día(s)). "
            "Redacta en futuro y enfoca recomendaciones para ese día concreto."
        )

    system_prompt = (
        f"{get_system_prompt(avatar_state, user_name)}\n\n"
        f"{SPANISH_ANALYSIS_RULE}\n"
        f"{forecast_target_rule}"
    )
    user_prompt = build_weather_user_prompt(
        weather_data,
        avatar_state,
        history,
        target_date=target_date,
        target_day_offset=target_day_offset,
    )

    try:
        llm_raw = await call_llm(system_prompt, user_prompt)
        llm_text = await _ensure_spanish_analysis(extract_llm_text(llm_raw))
    except Exception as exc:
        logger.error(f"LLM unavailable: {exc}")
        llm_text = "⚠️ El analisis de IA no esta disponible temporalmente. Arriba tienes los datos meteorologicos en bruto."

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
        target_day_offset=target_day_offset,
        target_date=target_date,
    )


@router.get("/history", response_model=List[WeatherRecordOut])
async def get_weather_history(
    limit: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Weather history for the authenticated user."""
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
