import csv
import io
import logging
import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Alert, EmergencyBroadcast, User, WeatherRecord
from app.schemas.schemas import EmergencyBroadcastOut, WeatherRecordOut
from app.services.prompt_engine import build_emergency_system_prompt, build_emergency_user_prompt
from app.services.weather_proxy import call_llm, extract_llm_text, get_weather
from app.websocket_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin2024!")


def _require_admin(password: str):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")


# ─── AUTH ─────────────────────────────────────────────────────────────────────

@router.post("/login")
async def admin_login(body: dict):
    _require_admin(body.get("password", ""))
    return {"status": "ok", "message": "Admin authenticated"}


# ─── STATS ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def stats(admin_password: str = Query(...), db: Session = Depends(get_db)):
    _require_admin(admin_password)
    return {
        "total_users": db.query(func.count(User.id)).scalar(),
        "total_weather_records": db.query(func.count(WeatherRecord.id)).scalar(),
        "active_alerts": db.query(func.count(Alert.id)).filter(Alert.is_active == True).scalar(),
        "emergency_broadcasts": db.query(func.count(EmergencyBroadcast.id)).scalar(),
        "connected_ws_clients": manager.connection_count,
    }


# ─── CHART DATA ───────────────────────────────────────────────────────────────

@router.get("/chart-data")
async def chart_data(
    admin_password: str = Query(...),
    days: int = 7,
    db: Session = Depends(get_db),
):
    _require_admin(admin_password)
    since = datetime.utcnow() - timedelta(days=days)
    records = (
        db.query(WeatherRecord)
        .filter(WeatherRecord.created_at >= since)
        .order_by(WeatherRecord.created_at.asc())
        .all()
    )
    return [
        {
            "date": r.created_at.strftime("%m/%d %H:%M"),
            "temperature": r.temperature,
            "humidity": r.humidity,
            "wind_speed": r.wind_speed,
            "is_disaster": r.is_disaster,
        }
        for r in records
    ]


# ─── HISTORY TABLE ────────────────────────────────────────────────────────────

@router.get("/weather-history")
async def weather_history(
    admin_password: str = Query(...),
    limit: int = 100,
    offset: int = 0,
    user_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
):
    _require_admin(admin_password)
    q = db.query(WeatherRecord).order_by(desc(WeatherRecord.created_at))

    if user_id:
        q = q.filter(WeatherRecord.user_id == user_id)
    if date_from:
        try:
            q = q.filter(WeatherRecord.created_at >= datetime.strptime(date_from, "%Y-%m-%d"))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(WeatherRecord.created_at < datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
        except ValueError:
            pass

    total = q.count()
    rows = q.offset(offset).limit(limit).all()
    return {"total": total, "records": [WeatherRecordOut.model_validate(r) for r in rows]}


# ─── CSV EXPORT ───────────────────────────────────────────────────────────────

@router.get("/export-csv")
async def export_csv(admin_password: str = Query(...), db: Session = Depends(get_db)):
    _require_admin(admin_password)
    rows = db.query(WeatherRecord).order_by(desc(WeatherRecord.created_at)).limit(2000).all()

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["ID", "User ID", "Date", "Temperature (°C)", "Humidity (%)", "Wind Speed (km/h)",
                "Description", "Avatar State", "Disaster", "LLM Response (truncated)"])
    for r in rows:
        w.writerow([
            r.id, r.user_id or "anon",
            r.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            r.temperature, r.humidity, r.wind_speed,
            r.description, r.avatar_state, r.is_disaster,
            (r.llm_response or "")[:120].replace("\n", " "),
        ])

    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=weatherself_history.csv"},
    )


# ─── USERS LIST ───────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(admin_password: str = Query(...), db: Session = Depends(get_db)):
    _require_admin(admin_password)
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {"id": u.id, "username": u.username, "email": u.email,
         "avatar_state": u.avatar_state, "created_at": u.created_at}
        for u in users
    ]


# ─── 🔴 THE RED BUTTON — EMERGENCY BROADCAST ──────────────────────────────────

@router.post("/emergency-broadcast")
async def emergency_broadcast(body: dict, db: Session = Depends(get_db)):
    """
    THE RED BUTTON.
    1. Verifies admin password.
    2. Fetches disaster weather from external API (?disaster=true).
    3. Sends to LLM with crisis system_prompt.
    4. Broadcasts to ALL connected WebSocket clients.
    5. Persists to EmergencyBroadcast table.
    """
    _require_admin(body.get("password", ""))

    logger.warning("🚨🚨🚨 EMERGENCY BROADCAST TRIGGERED 🚨🚨🚨")

    # Step 1 — fetch disaster weather
    try:
        disaster_data = await get_weather(disaster=True)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Cannot fetch disaster weather: {exc}")

    # Step 2 — generate LLM emergency message
    try:
        llm_raw = await call_llm(
            build_emergency_system_prompt(),
            build_emergency_user_prompt(disaster_data),
        )
        emergency_msg = extract_llm_text(llm_raw)
    except Exception as exc:
        logger.error(f"LLM failed during emergency: {exc}")
        emergency_msg = (
            "🚨 EMERGENCY WEATHER ALERT 🚨\n\n"
            "Severe dangerous weather conditions detected. "
            "Take shelter immediately and contact emergency services.\n\n"
            "⚠️ IMMEDIATE ACTIONS:\n"
            "1. Move to a safe indoor location\n"
            "2. Do not travel\n"
            "3. Monitor official emergency channels\n\n"
            "📞 Emergency: 112"
        )

    # Step 3 — broadcast via WebSocket
    connected = manager.connection_count
    await manager.broadcast({
        "type": "EMERGENCY_BROADCAST",
        "message": emergency_msg,
        "weather_data": disaster_data,
        "timestamp": datetime.utcnow().isoformat(),
        "severity": "CRITICAL",
    })

    # Step 4 — persist
    record = EmergencyBroadcast(
        weather_data=disaster_data,
        llm_message=emergency_msg,
        triggered_by="admin",
        recipients_count=connected,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    logger.warning(f"Emergency broadcast sent to {connected} clients | ID={record.id}")

    return {
        "status": "broadcast_sent",
        "message": emergency_msg,
        "recipients": connected,
        "broadcast_id": record.id,
    }


# ─── BROADCAST HISTORY ────────────────────────────────────────────────────────

@router.get("/broadcasts", response_model=List[EmergencyBroadcastOut])
async def list_broadcasts(admin_password: str = Query(...), db: Session = Depends(get_db)):
    _require_admin(admin_password)
    return (
        db.query(EmergencyBroadcast)
        .order_by(desc(EmergencyBroadcast.created_at))
        .limit(20)
        .all()
    )
