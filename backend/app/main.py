import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import admin, alerts, chat, user, weather, websocket
from app.services.auth_service import startup_auth

# Create all DB tables
os.makedirs("data", exist_ok=True)
Base.metadata.create_all(bind=engine)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="WeatherSelf API",
    description="Personalized meteorological assistant — hackathon edition",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow everything for the hackathon (ngrok URLs rotate, credentials are
# carried via Authorization header not cookies so allow_credentials=False is fine)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*", "ngrok-skip-browser-warning"],
)

# Register routers
app.include_router(user.router)
app.include_router(weather.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(alerts.router)
app.include_router(websocket.router)


@app.on_event("startup")
async def on_startup():
    logger.info("=" * 60)
    logger.info("  WeatherSelf API — starting up")
    logger.info("=" * 60)
    await startup_auth()
    logger.info("✅ WeatherSelf API ready")


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "healthy", "service": "WeatherSelf"}


@app.get("/", tags=["meta"])
async def root():
    return {"service": "WeatherSelf API", "version": "1.0.0", "docs": "/docs"}
