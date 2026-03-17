"""
seed.py — Realistic demo data for WeatherSelf
Usage:
    python seed.py          # skip if already seeded
    python seed.py --force  # wipe and re-seed
"""
import os
import random
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.makedirs("data", exist_ok=True)

from passlib.context import CryptContext

from app.database import SessionLocal, engine
from app.models.models import Alert, Base, EmergencyBroadcast, User, WeatherRecord

Base.metadata.create_all(bind=engine)
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

AVATARS = ["tired", "energized", "sick", "athletic", "important"]

WEATHER_SAMPLES = [
    {"temperature": 18.5, "feels_like": 17.2, "humidity": 65, "wind_speed": 12,
     "description": "Partly cloudy", "uv_index": 4, "pressure": 1013, "precipitation_prob": 20},
    {"temperature": 22.1, "feels_like": 21.8, "humidity": 45, "wind_speed": 8,
     "description": "Sunny", "uv_index": 7, "pressure": 1018, "precipitation_prob": 5},
    {"temperature": 10.3, "feels_like": 7.1, "humidity": 82, "wind_speed": 25,
     "description": "Heavy rain", "uv_index": 1, "pressure": 995, "precipitation_prob": 90},
    {"temperature": 15.7, "feels_like": 14.5, "humidity": 70, "wind_speed": 15,
     "description": "Overcast", "uv_index": 2, "pressure": 1008, "precipitation_prob": 45},
    {"temperature": 28.9, "feels_like": 30.2, "humidity": 38, "wind_speed": 5,
     "description": "Hot and sunny", "uv_index": 9, "pressure": 1020, "precipitation_prob": 2},
    {"temperature": 5.2, "feels_like": 2.1, "humidity": 90, "wind_speed": 30,
     "description": "Foggy", "uv_index": 0, "pressure": 1001, "precipitation_prob": 60},
    {"temperature": 20.0, "feels_like": 19.5, "humidity": 55, "wind_speed": 10,
     "description": "Light breeze", "uv_index": 5, "pressure": 1015, "precipitation_prob": 15},
]

LLM_RESPONSES = {
    "tired": [
        "18°C outside, jacket recommended if you leave. Rest up. 🧥",
        "Rain likely this afternoon. Stay warm and cozy. ☁️",
        "Cold and foggy — not worth going out. Sleep in. 😴",
    ],
    "energized": [
        "🌟 Perfect conditions! 22°C, UV 7, light winds — IDEAL for a long run or outdoor workout!\n\n📊 CONDITIONS\n• Temp: 22°C (feels like 22°C)\n• Humidity: 45% — excellent sweat efficiency\n• Wind: 8 km/h NW — barely noticeable\n• UV: 7 — apply SPF 30\n• Rain chance: 5% — negligible\n\n🎯 ACTIVITIES\n• Morning run: 7–9am for coolest air\n• Cycling: Full day window, light tailwind on eastern routes\n• Beach/park: Afternoon 2–5pm peak sun\n\n⏰ BEST WINDOW: 7–10am or 5–7pm",
        "☀️ Hot one today at 29°C — high energy day demands hydration!\n\n📊 CONDITIONS\n• Temp: 29°C (feels like 30°C!)\n• UV: 9 — CRITICAL, SPF 50+ required\n• Humidity: 38% — low, hydrate +30%\n• Wind: 5 km/h — minimal cooling\n\n🎯 ACTIVITIES\n• Early morning only (pre-9am)\n• Swimming or water sports: PERFECT\n• Avoid midday outdoor intensity\n\n⏰ BEST WINDOW: 6–9am before UV peaks",
    ],
    "sick": [
        "Today's cold air (10°C) with high humidity (82%) could irritate your respiratory tract. The dropping pressure may cause sinus pressure or headaches.\n\nIf you must venture out, dress in warm layers and limit exposure to under 30 minutes. The heavy rain adds wind chill — your body will work harder to maintain temperature.\n\n💊 Health action: Stay indoors, keep windows closed, drink hot fluids.",
        "It's overcast and cool at 15°C with 70% humidity — not ideal conditions for recovery. Damp air can feel oppressive when unwell.\n\nThe moderate wind (15 km/h) adds a chill factor. Your immune system needs warmth and rest more than fresh air today.\n\n🌡️ Health action: If you need air, a short 10-minute walk in full layers at midday is the safest window.",
    ],
    "athletic": [
        "🌡️ TEMP: 18.5°C — OPTIMAL performance zone ✅\n☀️ UV: 4 — SPF 20 sufficient\n💨 WIND: 12 km/h NW — slight headwind northbound, tailwind south\n💧 HUMIDITY: 65% — moderate, +200ml hydration vs baseline\n🌧️ RAIN: 20% chance, unlikely to impact\n⏰ TRAINING WINDOW: 7–11am or 4–7pm\n🏆 PERFORMANCE RATING: **GOOD** — near-ideal aerobic conditions\n🎯 GEAR: Light moisture-wicking layer, no jacket needed",
        "🌡️ TEMP: 22°C — upper optimal zone, watch core temp\n☀️ UV: 7 — SPF 30 mandatory, reapply every 90min\n💨 WIND: 8 km/h — negligible impact\n💧 HUMIDITY: 45% — excellent, low sweat evaporation barrier\n🌧️ RAIN: 5% — ignore\n⏰ TRAINING WINDOW: 6–9am STRONGLY recommended (pre-UV peak)\n🏆 PERFORMANCE RATING: **ELITE** — textbook conditions\n🎯 GEAR: Minimal — shorts, SPF shirt, sunglasses",
    ],
    "important": [
        "1. 👔 **OUTFIT**: 18°C with potential afternoon rain — dress in smart business layers. Carry a compact umbrella. Light blazer over professional wear is weather-proof and appropriate.\n\n2. 🚗 **COMMUTE**: Dry this morning. Depart before 9am. Rain arrives ~2pm — if you have outdoor commuting, plan return trip before 1:30pm.\n\n3. ⏰ **CRITICAL WINDOWS**: Leave before 8:30am (dry). Avoid 2–6pm outside (rain). Evening clear by 7pm.\n\n4. 💼 **PROFESSIONAL IMPACT**: Morning meetings unaffected. Any outdoor events should conclude by 1pm. Client arrival via taxi vs walking — advise taxis after noon.\n\n5. ✅ **EXECUTIVE SUMMARY**: Pack a compact umbrella and plan your afternoon transport in advance.",
    ],
}

ALERTS_SEED = [
    {"title": "Heat Advisory", "message": "Temperatures expected to reach 35°C this afternoon. Stay hydrated and avoid prolonged sun exposure.", "severity": "warning", "active": True},
    {"title": "Severe Storm Warning", "message": "Thunderstorms with lightning expected 3pm–7pm. Avoid outdoor activities and seek shelter.", "severity": "critical", "active": True},
    {"title": "Air Quality Notice", "message": "Moderate air quality index (85). Sensitive groups should limit outdoor exposure.", "severity": "info", "active": True},
    {"title": "Wind Advisory", "message": "Gusts up to 70 km/h expected tonight. Secure outdoor furniture and objects.", "severity": "warning", "active": False},
]


def seed():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            if "--force" not in sys.argv:
                print("✅ Database already has data. Use --force to re-seed.")
                return
            print("🗑️  Clearing existing data...")
            for model in [WeatherRecord, Alert, EmergencyBroadcast, User]:
                db.query(model).delete()
            db.commit()

        print("🌱 Seeding database...")

        # Create users
        users_config = [
            ("alice", "alice@weatherself.demo", "energized"),
            ("bob", "bob@weatherself.demo", "athletic"),
            ("charlie", "charlie@weatherself.demo", "important"),
            ("diana", "diana@weatherself.demo", "tired"),
            ("elena", "elena@weatherself.demo", "sick"),
            ("demo", "demo@weatherself.demo", "energized"),
        ]

        users = []
        for username, email, avatar in users_config:
            u = User(
                username=username,
                email=email,
                hashed_password=pwd.hash("password123"),
                avatar_state=avatar,
            )
            db.add(u)
            users.append(u)
        db.flush()

        # 14 weather records per user spanning 14 days
        record_count = 0
        for user in users:
            for day_offset in range(14):
                w = random.choice(WEATHER_SAMPLES).copy()
                avatar = random.choice(AVATARS)
                responses = LLM_RESPONSES.get(avatar, ["Weather data recorded."])
                noise_t = random.uniform(-2.0, 2.0)
                noise_h = random.uniform(-5.0, 5.0)
                noise_w = random.uniform(-3.0, 3.0)
                record = WeatherRecord(
                    user_id=user.id,
                    weather_data=w,
                    llm_response=random.choice(responses),
                    avatar_state=avatar,
                    is_disaster=False,
                    temperature=round(w["temperature"] + noise_t, 1),
                    humidity=round(w["humidity"] + noise_h, 1),
                    wind_speed=round(w["wind_speed"] + noise_w, 1),
                    description=w["description"],
                    created_at=datetime.utcnow() - timedelta(days=day_offset, hours=random.randint(0, 20)),
                )
                db.add(record)
                record_count += 1

        # Alerts
        for ad in ALERTS_SEED:
            db.add(Alert(
                title=ad["title"],
                message=ad["message"],
                severity=ad["severity"],
                is_active=ad["active"],
            ))

        # Historical emergency broadcast
        db.add(EmergencyBroadcast(
            weather_data={"temperature": -8, "wind_speed": 95, "description": "Blizzard",
                          "visibility_m": 30, "pressure": 968, "snow_accumulation_cm": 40},
            llm_message=(
                "🚨 EMERGENCY WEATHER ALERT 🚨\n\n"
                "A severe blizzard with 95km/h winds and near-zero visibility is affecting all areas. "
                "Snow accumulation of 40cm expected in 6 hours.\n\n"
                "⚠️ IMMEDIATE ACTIONS:\n"
                "1. Stay indoors — do NOT travel under any circumstances\n"
                "2. Prepare emergency supplies (water, food, medications) for 72 hours\n"
                "3. Keep phone charged and monitor official emergency channels\n\n"
                "📍 AFFECTED AREAS: All metropolitan areas\n"
                "⏱️ DURATION: 12–18 hours\n"
                "📞 EMERGENCY SERVICES: 112"
            ),
            triggered_by="admin",
            recipients_count=47,
            created_at=datetime.utcnow() - timedelta(days=5),
        ))

        db.commit()
        print(f"✅ Seeded {len(users)} users, {record_count} weather records, {len(ALERTS_SEED)} alerts, 1 emergency broadcast")
        print("\n🔑 Demo credentials (all use password: password123):")
        for username, email, avatar in users_config:
            print(f"   {username:<12} | {avatar}")
        print("\n🔴 Admin password: from .env ADMIN_PASSWORD (default: admin2024!)")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
