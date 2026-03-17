"""
auth_service.py
Handles registration + JWT auth with the external EC2 API.
Runs on startup: register (handles 409), then login to get Bearer token.
All outgoing proxy requests attach Authorization: Bearer <token>.
Auto-refreshes on 401.
"""
import asyncio
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

API_BASE_URL = os.getenv("API_BASE_URL", "http://ec2-54-171-51-31.eu-west-1.compute.amazonaws.com")
API_NICK = os.getenv("API_NICK", "weatherself_bot")
API_TEAM = os.getenv("API_TEAM", "WeatherSelf")
API_PASSWORD = os.getenv("API_PASSWORD", "Hackaton2024!")

_token: Optional[str] = None
_token_lock = asyncio.Lock()


async def register_account() -> bool:
    """
    POST /register with form fields: nickName, teamName, password.
    Idempotent — 409 means already registered, that's fine.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                f"{API_BASE_URL}/register",
                data={
                    "nickName": API_NICK,
                    "teamName": API_TEAM,
                    "password": API_PASSWORD,
                },
            )
            if resp.status_code in (200, 201):
                logger.info("✅ Registered on external API")
                return True
            elif resp.status_code == 409:
                logger.info("ℹ️  Account already exists on external API (409) — OK")
                return True
            else:
                logger.error(f"Registration failed {resp.status_code}: {resp.text[:200]}")
                return False
        except Exception as exc:
            logger.error(f"Registration exception: {exc}")
            return False


async def _do_login() -> Optional[str]:
    """
    POST /login with form fields: nickName, password.
    Returns the Bearer token string, or None on failure.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                f"{API_BASE_URL}/login",
                data={
                    "nickName": API_NICK,
                    "password": API_PASSWORD,
                },
            )
            if resp.status_code == 200:
                body = resp.json()
                # Handles multiple possible token field names from various API designs
                token = (
                    body.get("access_token")
                    or body.get("token")
                    or body.get("Bearer")
                    or body.get("bearer")
                    or body.get("jwt")
                    or (body.get("data") or {}).get("token")
                    or (body.get("data") or {}).get("access_token")
                )
                if token:
                    logger.info("✅ Logged in to external API, token acquired")
                    return str(token)
                else:
                    logger.error(f"Login 200 but no token found in: {list(body.keys())}")
                    return None
            else:
                logger.error(f"Login failed {resp.status_code}: {resp.text[:200]}")
                return None
        except Exception as exc:
            logger.error(f"Login exception: {exc}")
            return None


async def get_token() -> Optional[str]:
    """Returns cached token, logs in if not yet acquired."""
    global _token
    async with _token_lock:
        if _token is None:
            _token = await _do_login()
        return _token


async def refresh_token() -> Optional[str]:
    """Force re-login and update cached token."""
    global _token
    async with _token_lock:
        logger.info("Refreshing external API token...")
        _token = await _do_login()
        return _token


async def get_auth_headers() -> dict:
    """Returns {'Authorization': 'Bearer <token>'} or {} if unauthenticated."""
    token = await get_token()
    return {"Authorization": f"Bearer {token}"} if token else {}


async def startup_auth():
    """Called once at FastAPI startup."""
    logger.info("🚀 Starting external API authentication sequence...")
    await register_account()
    token = await _do_login()
    global _token
    _token = token
    if token:
        logger.info("🔑 External API authentication complete")
    else:
        logger.warning("⚠️  External API authentication failed — will retry on first request")
