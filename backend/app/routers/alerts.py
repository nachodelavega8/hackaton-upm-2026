import logging
import os
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Alert
from app.schemas.schemas import AlertCreate, AlertOut, AlertUpdate
from app.websocket_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/alerts", tags=["alerts"])

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin")


def _require_admin(password: str):
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")


@router.get("/", response_model=List[AlertOut])
async def get_active_alerts(db: Session = Depends(get_db)):
    """Public — returns only active alerts (shown on user dashboard)."""
    return (
        db.query(Alert)
        .filter(Alert.is_active == True)
        .order_by(Alert.created_at.desc())
        .all()
    )


@router.get("/all", response_model=List[AlertOut])
async def get_all_alerts(
    admin_password: str = Query(...),
    db: Session = Depends(get_db),
):
    _require_admin(admin_password)
    return db.query(Alert).order_by(Alert.created_at.desc()).all()


@router.post("/", response_model=AlertOut, status_code=201)
async def create_alert(
    body: AlertCreate,
    admin_password: str = Query(...),
    db: Session = Depends(get_db),
):
    _require_admin(admin_password)
    if body.severity not in ("info", "warning", "critical"):
        raise HTTPException(status_code=400, detail="severity must be info | warning | critical")

    alert = Alert(
        title=body.title,
        message=body.message,
        severity=body.severity,
        expires_at=body.expires_at,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Push real-time notification to all connected users
    await manager.broadcast({
        "type": "ALERT_NOTIFICATION",
        "id": alert.id,
        "title": alert.title,
        "message": alert.message,
        "severity": alert.severity,
        "timestamp": datetime.utcnow().isoformat(),
    })

    return alert


@router.put("/{alert_id}", response_model=AlertOut)
async def update_alert(
    alert_id: int,
    body: AlertUpdate,
    admin_password: str = Query(...),
    db: Session = Depends(get_db),
):
    _require_admin(admin_password)
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(alert, field, val)

    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    admin_password: str = Query(...),
    db: Session = Depends(get_db),
):
    _require_admin(admin_password)
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    db.delete(alert)
    db.commit()
    return {"status": "deleted", "id": alert_id}
