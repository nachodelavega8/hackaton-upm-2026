import logging
from typing import Dict, Any, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.user_connections[user_id] = websocket
        logger.info(f"WS connected (user={user_id}). Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket, user_id: str = None):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]
        logger.info(f"WS disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast to ALL connected clients. Cleans up dead connections."""
        dead = []
        for conn in self.active_connections:
            try:
                await conn.send_json(message)
            except Exception as e:
                logger.warning(f"Broadcast failed for a client: {e}")
                dead.append(conn)
        for conn in dead:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

    async def send_to_user(self, message: Dict[str, Any], user_id: str):
        ws = self.user_connections.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Personal send failed for {user_id}: {e}")
                del self.user_connections[user_id]

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


manager = WebSocketManager()
