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

Phase 3 intake bootstrap endpoints:

- `GET /api/v1/intake/channels`
- `POST /api/v1/intake/channels`
- `PATCH /api/v1/intake/channels/{channel_id}`
- `POST /api/v1/intake/channels/{channel_id}/sync`

When a channel is `enabled`, the backend also runs automatic polling in background
(default interval follows `poll_interval_seconds`, default `30s`).

Phase 3 manual-check automation (scheduler hot update/failure isolation + edit versioning):

```bash
python -m pytest tests/integration/test_phase3_manual_checks_auto.py -q
```

Example create payload:

```json
{
  "channel_name": "CryptoNinjas Trading",
  "source_type": "telegram_web",
  "source_ref": "https://t.me/s/cryptoninjas_trading_ann"
}
```
