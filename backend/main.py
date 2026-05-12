"""FastAPI application entry point.

Registers all routers and starts the session expiry sweeper as a background
task in the FastAPI lifespan context.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import agent, auth, generation, intelligence, preview
from backend.session.store import sweep_expired

logger = logging.getLogger(__name__)

_SWEEP_INTERVAL_SECONDS = 15 * 60  # 15 minutes


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    sweep_task = asyncio.create_task(_session_sweep_loop())
    logger.info("Calibra backend started. Session sweeper running.")
    try:
        yield
    finally:
        sweep_task.cancel()
        try:
            await sweep_task
        except asyncio.CancelledError:
            pass
        logger.info("Calibra backend shutting down.")


async def _session_sweep_loop() -> None:
    while True:
        await asyncio.sleep(_SWEEP_INTERVAL_SECONDS)
        try:
            removed = await sweep_expired()
            if removed:
                logger.info("Session sweeper removed %d expired session(s).", removed)
        except Exception:
            logger.exception("Session sweeper encountered an error.")


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Calibra Synthetic Data Engine",
    description=(
        "Domain-configurable synthetic data generation for financial crime datasets. "
        "Upload a CSV or describe your schema via agent, configure domain constraints, "
        "and download audit-trail-backed synthetic data."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Router registration ────────────────────────────────────────────────────────

app.include_router(auth.router)
app.include_router(generation.router)
app.include_router(intelligence.router)
app.include_router(preview.router)
app.include_router(agent.router)


# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "service": "calibra"}
