from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuthSession


class AuthSessionRepository:
    async def create(
        self,
        db: AsyncSession,
        *,
        session_id: str,
        token_hash: str,
        issued_at: datetime,
        expires_at: datetime,
        ip_hash: str,
        user_agent_hash: str,
    ) -> AuthSession:
        model = AuthSession(
            session_id=session_id,
            token_hash=token_hash,
            issued_at=issued_at,
            expires_at=expires_at,
            last_seen_at=issued_at,
            ip_hash=ip_hash,
            user_agent_hash=user_agent_hash,
        )
        db.add(model)
        await db.flush()
        return model

    async def get_active_by_token_hash(
        self,
        db: AsyncSession,
        token_hash: str,
        now: datetime,
    ) -> AuthSession | None:
        stmt = select(AuthSession).where(
            and_(
                AuthSession.token_hash == token_hash,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def revoke_by_token_hash(
        self,
        db: AsyncSession,
        token_hash: str,
        now: datetime,
        reason: str,
    ) -> AuthSession | None:
        session = await self.get_active_by_token_hash(db, token_hash=token_hash, now=now)
        if session is None:
            return None
        session.revoked_at = now
        session.revoked_reason = reason
        await db.flush()
        return session

    async def touch(self, db: AsyncSession, session: AuthSession, now: datetime) -> None:
        session.last_seen_at = now
        await db.flush()
