@echo off
cd /d "D:\auto-trade\auto-trade\apps\api"
set POSTGRES_DSN=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_trade
set REDIS_URL=redis://127.0.0.1:6379/10
set AUTO_CREATE_SCHEMA=true
set SESSION_TTL_MINUTES=30
set LOGIN_RATE_LIMIT_MAX_REQUESTS=50
set LOGIN_RATE_LIMIT_WINDOW_SECONDS=60
set LOGIN_LOCK_THRESHOLD=5
set LOGIN_LOCK_DURATION_SECONDS=30
set CORS_ORIGINS=http://127.0.0.1:5173
set OWNER_PASSWORD_HASH=$argon2id$v=19$m=65536,t=3,p=4$zfIklw1znEJIL88ykoS9Qw$kWDIbYQFZZ+FxeESjAfQ4TdLS3NVFJ0oSM+TVOqNE/w
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 1>>"D:\auto-trade\auto-trade\.tmp\api.out.log" 2>>"D:\auto-trade\auto-trade\.tmp\api.err.log"
