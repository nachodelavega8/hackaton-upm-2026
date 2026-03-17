.PHONY: dev seed build install clean help

help:
	@echo ""
	@echo "  WeatherSelf — Makefile Commands"
	@echo "  ─────────────────────────────────────────────────────"
	@echo "  make install   Install all dependencies"
	@echo "  make dev       Start backend + frontend dev servers"
	@echo "  make seed      Seed the SQLite database with demo data"
	@echo "  make build     Build Docker images"
	@echo "  make up        Start with docker-compose"
	@echo "  make down      Stop docker-compose services"
	@echo "  make clean     Remove DB and cache files"
	@echo ""

install:
	@echo "📦 Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✅ All dependencies installed"

dev:
	@echo "🚀 Starting WeatherSelf in development mode..."
	@cp -n .env.example .env 2>/dev/null || true
	@mkdir -p backend/data
	@echo "Starting backend on http://localhost:8000 ..."
	@(cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &
	@echo "Starting frontend on http://localhost:5173 ..."
	@(cd frontend && npm run dev)

seed:
	@echo "🌱 Seeding database with demo data..."
	@mkdir -p backend/data
	cd backend && python seed.py
	@echo "✅ Database seeded"

seed-force:
	@echo "🌱 Force re-seeding database..."
	cd backend && python seed.py --force

build:
	@echo "🐳 Building Docker images..."
	docker-compose build

up:
	@echo "🐳 Starting services with docker-compose..."
	@cp -n .env.example .env 2>/dev/null || true
	docker-compose up -d
	@echo "✅ Services started"
	@echo "  Frontend: http://localhost:80"
	@echo "  Backend:  http://localhost:8000"
	@echo "  API docs: http://localhost:8000/docs"

down:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	@echo "🗑️  Cleaning up..."
	rm -rf backend/data/
	rm -rf backend/__pycache__
	find backend -name "*.pyc" -delete
	find backend -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Cleaned"
