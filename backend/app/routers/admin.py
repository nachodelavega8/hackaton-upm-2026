import csv
import io
import json
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

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin")

EMERGENCY_TO_ALERT_SEVERITY = {
    "amarillo": "info",
    "naranja": "warning",
    "rojo": "critical",
}


def _require_admin(password: str):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")


def _build_emergency_alert_message(title: str, actions: list) -> str:
    if not actions:
        return title
    numbered_actions = "\n".join(f"{idx + 1}. {action}" for idx, action in enumerate(actions))
    return f"{title}\n\nAcciones recomendadas:\n{numbered_actions}"


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


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin_password: str = Query(...),
    db: Session = Depends(get_db),
):
    _require_admin(admin_password)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    username = user.username
    deleted_weather_records = (
        db.query(WeatherRecord)
        .filter(WeatherRecord.user_id == user_id)
        .delete(synchronize_session=False)
    )
    db.delete(user)
    db.commit()

    logger.warning(
        "Admin deleted user id=%s username=%s weather_records=%s",
        user_id,
        username,
        deleted_weather_records,
    )

    return {
        "status": "deleted",
        "user_id": user_id,
        "username": username,
        "deleted_weather_records": deleted_weather_records,
    }


# ─── 🔴 THE RED BUTTON — EMERGENCY BROADCAST ──────────────────────────────────

@router.post("/emergency-broadcast")
async def emergency_broadcast(body: dict, db: Session = Depends(get_db)):
    """
    THE RED BUTTON.
    1. Verifies admin password.
    2. Accepts structured alert payload (cause, severity, actions, title, color).
    3. Broadcasts to ALL connected WebSocket clients.
    4. Persists to EmergencyBroadcast table.
    """
    _require_admin(body.get("password", ""))
    cause = body.get("cause", "")
    severity = body.get("severity", "")
    raw_actions = body.get("actions", [])
    actions = raw_actions if isinstance(raw_actions, list) else []
    title = body.get("title", "🚨 Alerta de Emergencia")
    color = body.get("color", "#ef4444")
    timestamp = datetime.utcnow().isoformat()

    logger.warning(f"🚨🚨🚨 EMERGENCY BROADCAST: {title} ({cause}/{severity}) 🚨🚨🚨")

    # Real-time push for currently connected sessions.
    connected = manager.connection_count
    total_users = db.query(func.count(User.id)).scalar() or 0
    print(f"[WS] Broadcasting emergency to {connected} clients")
    await manager.broadcast({
        "type": "EMERGENCY_BROADCAST",
        "cause": cause,
        "severity": severity,
        "actions": actions,
        "title": title,
        "color": color,
        "timestamp": timestamp,
    })

    # Persist history and create a global alert visible for all users.
    record = EmergencyBroadcast(
        weather_data={"cause": cause, "severity": severity},
        llm_message=title,
        cause=cause,
        severity=severity,
        alert_title=title,
        alert_color=color,
        actions=actions,
        triggered_by="admin",
        recipients_count=total_users,
    )

    alert = Alert(
        title=title,
        message=_build_emergency_alert_message(title, actions),
        severity=EMERGENCY_TO_ALERT_SEVERITY.get(severity, "critical"),
        created_by="admin-emergency",
    )

    db.add(record)
    db.add(alert)
    db.commit()
    db.refresh(record)
    db.refresh(alert)

    # Standard notification frame for the bell tray in connected clients.
    await manager.broadcast({
        "type": "ALERT_NOTIFICATION",
        "id": alert.id,
        "title": alert.title,
        "message": alert.message,
        "severity": alert.severity,
        "timestamp": timestamp,
    })

    logger.warning(
        f"Emergency broadcast sent to all users ({total_users}) with {connected} connected in real time | ID={record.id}"
    )

    return {
        "status": "broadcast_sent",
        "message": title,
        "recipients": total_users,
        "connected_recipients": connected,
        "broadcast_id": record.id,
        "alert_id": alert.id,
    }


@router.post("/emergency-stop")
async def emergency_stop(body: dict, db: Session = Depends(get_db)):
    """Stops current emergency state and deactivates emergency alerts."""
    _require_admin(body.get("password", ""))

    cleared_alerts = (
        db.query(Alert)
        .filter(Alert.created_by == "admin-emergency", Alert.is_active == True)
        .update({"is_active": False}, synchronize_session=False)
    )
    db.commit()

    timestamp = datetime.utcnow().isoformat()
    await manager.broadcast({
        "type": "EMERGENCY_CLEAR",
        "message": "La alerta de emergencia ha sido detenida por el panel de administración.",
        "timestamp": timestamp,
    })

    logger.warning("Emergency alert stopped by admin | cleared_alerts=%s", cleared_alerts)

    return {
        "status": "stopped",
        "message": "Alerta de emergencia detenida.",
        "cleared_alerts": cleared_alerts,
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
