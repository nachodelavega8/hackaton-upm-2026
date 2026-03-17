import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import admin, alerts, user, weather, websocket
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

# CORS — allow Vite dev server and production origins
_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(user.router)
app.include_router(weather.router)
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
