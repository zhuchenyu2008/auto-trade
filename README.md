# auto-trade

[English](./README.md) | [简体中文](./README.zh-CN.md)

`auto-trade` is a monorepo for an AI-assisted trading console.
Current implementation is focused on:

- Web console prototype (`apps/web`)
- Backend foundation (`apps/api`)
- Phase checklists and technical design docs (`docs`)

## Current Status (2026-03-27)

- Phase 1 (web console prototype): core pages completed
- Phase 2 (backend foundation + frontend wiring): completed
- Phase 3+ (Telegram intake, AI decision engine, OKX execution, virtual ledger): planned/in progress

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

## Quick Start

### 1) Start dependencies (PostgreSQL + Redis)

If you use Docker locally:

```bash
docker run -d --name auto-trade-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=auto_trade -p 5432:5432 postgres:16
docker run -d --name auto-trade-redis -p 6379:6379 redis:7
```

### 2) Run API (`apps/api`)

```bash
cd apps/api
python -m pip install -e .[dev]
cp .env.example .env
```

Generate password hash (example password `123456`):

```bash
python -c "from argon2 import PasswordHasher; print(PasswordHasher().hash('123456'))"
```

Put the generated hash into `OWNER_PASSWORD_HASH` in `.env`, then start:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API base URL: `http://127.0.0.1:8000`

### 3) Run Web (`apps/web`)

```bash
cd apps/web
npm install
cp .env.example .env
npm run dev
```

Web URL: `http://127.0.0.1:5173`

To connect web to real backend, set:

```env
VITE_DATA_SOURCE=api
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_ENABLE_SSE=true
```

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

Note: some compatibility resources are currently placeholder/empty responses and will be implemented in later phases.

## Common Commands

### API

```bash
cd apps/api
python -m pytest tests/unit -q
python -m pytest tests/integration -q
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
