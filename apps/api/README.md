# auto-trade-api

Phase 2 backend foundation for `auto-trade`:

- FastAPI service skeleton
- PostgreSQL + Redis connectivity
- Auth/session + lock/limit baseline
- Runtime settings, logs, and SSE endpoints
- Health checks (`live`/`ready`/`deps`)

## Quick start

1. Copy env file:

```bash
cp .env.example .env
```

2. Fill `OWNER_PASSWORD_HASH` with an Argon2 hash.
3. Ensure PostgreSQL and Redis are reachable.
4. Run service:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Contract scope

Phase 2 core endpoints:

- `GET /health/live`
- `GET /health/ready`
- `GET /health/deps`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/settings/runtime`
- `PUT /api/v1/settings/runtime`
- `GET /api/v1/logs`
- `GET /api/v1/events/stream`
