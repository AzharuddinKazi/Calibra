"""In-memory session store with asyncio.Lock and TTL-based expiry."""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from backend.constants import SESSION_TTL_HOURS
from backend.models.schemas import Session

logger = logging.getLogger(__name__)

_store: dict[str, Session] = {}
_lock = asyncio.Lock()


async def create_session(session: Session) -> None:
    """Store a new session. Overwrites if the session_id already exists."""
    async with _lock:
        _store[session.session_id] = session


async def get_session(session_id: str) -> Session | None:
    """Return the session for *session_id*, or None if missing or expired."""
    async with _lock:
        session = _store.get(session_id)
        if session is None:
            return None
        if _is_expired(session):
            del _store[session_id]
            logger.debug("Session %s expired on read", session_id)
            return None
        return session


async def update_session(session: Session) -> None:
    """Replace the stored session with an updated copy."""
    async with _lock:
        _store[session.session_id] = session


async def delete_session(session_id: str) -> None:
    """Remove a session explicitly."""
    async with _lock:
        _store.pop(session_id, None)


async def sweep_expired() -> int:
    """Remove all expired sessions. Returns the number of sessions removed."""
    async with _lock:
        expired = [sid for sid, s in _store.items() if _is_expired(s)]
        for sid in expired:
            del _store[sid]
    if expired:
        logger.info("Session sweep removed %d expired session(s)", len(expired))
    return len(expired)


def make_session_expiry() -> datetime:
    """Return the expiry datetime for a new session."""
    return datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)


def _is_expired(session: Session) -> bool:
    now = datetime.now(timezone.utc)
    expires = session.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return now >= expires
