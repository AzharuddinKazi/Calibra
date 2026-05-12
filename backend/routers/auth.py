"""JWT auth endpoints — /auth/register, /auth/login, /auth/me."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.models.schemas import TokenResponse, UserCreate, UserLogin, UserOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Config ────────────────────────────────────────────────────────────────────

_SECRET_KEY = "calibra-dev-secret-change-in-production"
_ALGORITHM = "HS256"
_ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)

# In-memory user store: email → {"user_id": str, "hashed_password": str}
_user_store: dict[str, dict] = {}


# ── POST /auth/register ────────────────────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(req: UserCreate) -> UserOut:
    """Register a new user."""
    email = req.email.lower().strip()
    if email in _user_store:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    user_id = str(uuid.uuid4())
    _user_store[email] = {
        "user_id": user_id,
        "hashed_password": _pwd_context.hash(req.password),
        "email": email,
    }
    logger.info("Registered user: %s (%s)", email, user_id)
    return UserOut(user_id=user_id, email=email)


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin) -> TokenResponse:
    """Authenticate and return a JWT."""
    email = req.email.lower().strip()
    user = _user_store.get(email)
    if user is None or not _pwd_context.verify(req.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = _create_token(subject=user["user_id"])
    return TokenResponse(access_token=token)


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserOut)
async def me(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> UserOut:
    """Return the authenticated user's profile."""
    user = _require_auth(creds)
    return UserOut(user_id=user["user_id"], email=user["email"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _create_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, _SECRET_KEY, algorithm=_ALGORITHM)


def _require_auth(creds: HTTPAuthorizationCredentials | None) -> dict:
    """Validate a Bearer JWT and return the user record. Raises 401 on failure."""
    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
        )
    try:
        payload = jwt.decode(creds.credentials, _SECRET_KEY, algorithms=[_ALGORITHM])
        user_id: str = payload.get("sub", "")
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from exc

    for user in _user_store.values():
        if user["user_id"] == user_id:
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="User no longer exists.",
    )


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """FastAPI dependency — returns current user or raises 401."""
    return _require_auth(creds)
