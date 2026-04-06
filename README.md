# auto-trade

[English](./README.md) | [简体中文](./README.zh-CN.md)

`auto-trade` is a monorepo for an AI-assisted trading console.
Current implementation is focused on:

- Web console prototype (`apps/web`)
- Backend foundation (`apps/api`)
- Phase checklists and technical design docs (`docs`)

## Current Status (2026-04-06)

- Phase 1 (web console prototype): core pages completed
- Phase 2 (backend foundation + frontend wiring): completed
- Phase 3.1/3.2 (Telegram intake + message persistence): completed with automated manual-check coverage
- Phase 3+ (AI decision engine, OKX execution, virtual ledger): planned/in progress

The project is usable today for local API/web integration and regression tests, but it is not a complete end-to-end trading system yet.

## Repository Layout

```text
auto-trade/
  apps/
    api/        FastAPI backend (auth, settings, logs, SSE, health)
    web/        React + Vite console
  docs/         Requirements, phase checklists, technical design
  README.md     This file
```

## Tech Stack

- Backend: Python 3.11+, FastAPI, SQLAlchemy (async), Redis
- Frontend: React 18, TypeScript, Vite
- Storage: PostgreSQL + Redis
- Tests: pytest, Playwright

## Prerequisites

- Python 3.11+
- Node.js 18+ (Node 20 recommended)
- npm
- PostgreSQL 16+ (or compatible)
- Redis 7+ (or compatible)

## Quick Start (Real API Mode)

Run from repo root (`auto-trade/`).

### 1) Start dependencies (PostgreSQL + Redis)

If this is your first run:

```bash
docker run -d --name auto-trade-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=auto_trade -p 5432:5432 postgres:16
docker run -d --name auto-trade-redis -p 6379:6379 redis:7
```

If containers already exist:

```bash
docker start auto-trade-postgres auto-trade-redis
```

### 2) Configure and run API (`apps/api`)

```bash
cd apps/api
python -m pip install -e .[dev]
cp .env.example .env
```

PowerShell equivalent for copy: `Copy-Item .env.example .env -Force`

Generate `OWNER_PASSWORD_HASH` (example password is `123456`):

```bash
python -c "from argon2 import PasswordHasher; print(PasswordHasher().hash('123456'))"
```

Paste the generated hash into `.env`, then run:

```bash
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

API URL: `http://127.0.0.1:8000` (prefix: `/api/v1`)

Recommended in `apps/api/.env`:

```env
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3) Configure and run Web (`apps/web`)

```bash
cd apps/web
npm install
cp .env.example .env
```

PowerShell equivalent for copy: `Copy-Item .env.example .env -Force`

Set web env to API mode:

```env
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_ENABLE_SSE=true
```

Then start web:

```bash
npm run dev -- --host 127.0.0.1 --port 5173
```

Web URL: `http://127.0.0.1:5173`

### 4) First login and quick validation

- Login with `123456` (if you used the example hash command above).
- Open `/settings` and `/logs` to confirm API data is loading.
- Optional regression checks:

```bash
cd apps/api
python -m pytest tests/integration/test_phase3_manual_checks_auto.py -q
python -m pytest tests -q
```

```bash
cd apps/web
npx playwright test tests/phase-4-3-api-real-backend.spec.ts --workers=1
npx playwright test tests/phase-2-manual-checks-real-backend.spec.ts --workers=1
```

### 5) Troubleshooting

- Login preflight `OPTIONS /api/v1/auth/login` returns `400`:
  set `CORS_ORIGINS` to include your current web origin (for local dev, include both `localhost` and `127.0.0.1`).
- Login stays on `/login` and API logs show `POST /auth/login 404`:
  ensure `VITE_API_BASE_URL` is exactly `http://127.0.0.1:8000/api/v1`.
- Login succeeds but session seems lost:
  do not mix hosts across browser/API (avoid `localhost` + `127.0.0.1` split). Keep them consistent.
- `/health/ready` or `/auth/login` returns `503`:
  PostgreSQL/Redis is unavailable or misconfigured.
- Port conflict on `8000` or `5173`:
  stop the existing process, or start on another port and update env accordingly.

## Environment Variables

### API (`apps/api/.env`)

Required:

- `POSTGRES_DSN` (example: `postgresql+asyncpg://postgres:postgres@localhost:5432/auto_trade`)
- `REDIS_URL` (example: `redis://localhost:6379/0`)
- `OWNER_PASSWORD_HASH` (Argon2 hash)

Common options:

- `APP_ENV`, `APP_HOST`, `APP_PORT`, `API_PREFIX`
- `CORS_ORIGINS` (default: `http://localhost:5173`)
- `AUTO_CREATE_SCHEMA` (default: `true`)

### Web (`apps/web/.env`)

- `VITE_DATA_SOURCE` = `mock` or `api`
- `VITE_API_BASE_URL` = API prefix base (default `/api/v1`)
- `VITE_ENABLE_SSE` = `true` or `false`

## API Snapshot

Stable foundation endpoints:

- Health: `/health/live`, `/health/ready`, `/health/deps`
- Auth: `/api/v1/auth/login`, `/api/v1/auth/session`, `/api/v1/auth/logout`
- Runtime settings: `/api/v1/settings/runtime`
- Logs: `/api/v1/logs`
- SSE: `/api/v1/events/stream`

Compatibility endpoints for frontend integration (Phase 2 scope):

- `/api/v1/overview/summary`
- `/api/v1/channels` (list/create/patch)
- `/api/v1/manual-confirmations`
- `/api/v1/orders`, `/api/v1/fills`, `/api/v1/real-positions`, `/api/v1/virtual-positions`

Phase 3 intake endpoints (backend minimum runnable):

- `/api/v1/intake/channels` (list/create/patch)
- `/api/v1/intake/channels/{channel_id}/sync`

Note: some compatibility resources are currently placeholder/empty responses and will be implemented in later phases.

## Common Commands

### API

```bash
cd apps/api
python -m pytest tests/unit -q
python -m pytest tests/integration -q
python -m pytest tests/integration/test_phase3_manual_checks_auto.py -q
python -m pytest tests -q
```

### Web

```bash
cd apps/web
npm run typecheck
npm run build
```

API-mode E2E examples:

```bash
cd apps/web
npx playwright test tests/phase-4-3-api-real-backend.spec.ts --workers=1
npx playwright test tests/phase-2-manual-checks-real-backend.spec.ts --workers=1
```

## Documentation

- Product and scope: `docs/project-spec.md`, `docs/requirements-v1.md`
- Delivery status: `docs/project-phase-checklist.md`
- Test checklist: `docs/project-phase-test-checklist.md`
- Technical design index: `docs/technical-design/README.md`
