"""
weather_proxy.py
Proxies all requests to the external EC2 API server-side.
Eliminates CORS / mixed-content issues from the browser.
Handles 401 token refresh automatically.
"""
import logging
import os
from typing import Any, Dict

import httpx

from app.services.auth_service import get_auth_headers, refresh_token

logger = logging.getLogger(__name__)

API_BASE_URL = os.getenv("API_BASE_URL", "http://ec2-54-171-51-31.eu-west-1.compute.amazonaws.com")
_TIMEOUT = httpx.Timeout(60.0, connect=15.0)


async def _request(method: str, path: str, retry: bool = True, **kwargs) -> Any:
    """Authenticated request to external API. Auto-refreshes token on 401."""
    headers = await get_auth_headers()
    headers.update(kwargs.pop("extra_headers", {}))

    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        resp = await client.request(method, f"{API_BASE_URL}{path}", headers=headers, **kwargs)

        if resp.status_code == 401 and retry:
            logger.info("Got 401 from external API — refreshing token and retrying")
            await refresh_token()
            headers = await get_auth_headers()
            resp = await client.request(method, f"{API_BASE_URL}{path}", headers=headers, **kwargs)

        resp.raise_for_status()

        # Try JSON first, fall back to text
        try:
            return resp.json()
        except Exception:
            return {"raw": resp.text}


async def get_weather(disaster: bool = False) -> Dict[str, Any]:
    """
    GET /weather?disaster=false  — normal weather data
    GET /weather?disaster=true   — disaster/emergency scenario
    """
    logger.info(f"Fetching weather (disaster={disaster})")
    try:
        data = await _request("GET", "/weather", params={"disaster": str(disaster).lower()})
        return data
    except httpx.HTTPStatusError as exc:
        logger.error(f"Weather fetch HTTP error {exc.response.status_code}: {exc.response.text[:300]}")
        raise
    except Exception as exc:
        logger.error(f"Weather fetch error: {exc}")
        raise


async def call_llm(system_prompt: str, user_prompt: str) -> Dict[str, Any]:
    """
    POST /prompt  { system_prompt, user_prompt }
    Powered by AWS Bedrock — high-quality responses.
    """
    logger.info("Calling external LLM endpoint")
    try:
        data = await _request(
            "POST",
            "/prompt",
            json={"system_prompt": system_prompt, "user_prompt": user_prompt},
        )
        return data
    except httpx.HTTPStatusError as exc:
        logger.error(f"LLM call HTTP error {exc.response.status_code}: {exc.response.text[:300]}")
        raise
    except Exception as exc:
        logger.error(f"LLM call error: {exc}")
        raise


def extract_llm_text(llm_response: Any) -> str:
    """Normalize LLM response — handles string, dict with various field names."""
    if isinstance(llm_response, str):
        return llm_response
    if isinstance(llm_response, dict):
        return (
            llm_response.get("response")
            or llm_response.get("content")
            or llm_response.get("text")
            or llm_response.get("message")
            or llm_response.get("output")
            or llm_response.get("result")
            or llm_response.get("completion")
            or llm_response.get("answer")
            or str(llm_response)
        )
    return str(llm_response)
