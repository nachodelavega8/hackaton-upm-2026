import logging
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.websocket_manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def ws_endpoint(
    websocket: WebSocket,
    user_id: Optional[str] = Query(default=None),
):
    """
    Real-time WebSocket endpoint.
    - Accepts user_id query param for personalized routing.
    - Sends CONNECTED confirmation on join.
    - Listens for PING and responds with PONG.
    - Emergency broadcasts are pushed server-side via WebSocketManager.
    """
    await manager.connect(websocket, user_id)

    try:
        await websocket.send_json({
            "type": "CONNECTED",
            "message": "Connected to WeatherSelf real-time system",
            "active_clients": manager.connection_count,
        })

        while True:
            data = await websocket.receive_json()
            if data.get("type") == "PING":
                await websocket.send_json({"type": "PONG"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        logger.info(f"Client {user_id or 'anon'} disconnected gracefully")

    except Exception as exc:
        logger.error(f"WebSocket error for {user_id}: {exc}")
        manager.disconnect(websocket, user_id)
