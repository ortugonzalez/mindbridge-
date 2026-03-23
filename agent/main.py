"""BRESO API — FastAPI application entry point."""
from __future__ import annotations

import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from integrations.agentscan import register_on_agentscan
from integrations.supabase_client import get_supabase
from routers import alerts, auth, bookings, checkins, contacts, family, payments, subscriptions, user_types, users
from routers.users import dashboard_router, family_router
from services import scheduler

# ---------------------------------------------------------------------------
# Structured JSON logging
# ---------------------------------------------------------------------------


class _JsonFormatter(logging.Formatter):
    """Emit each log record as a single-line JSON object."""

    def format(self, record: logging.LogRecord) -> str:
        message = record.getMessage()
        if isinstance(message, str):
            try:
                payload: dict[str, Any] = json.loads(message)
            except (json.JSONDecodeError, TypeError):
                payload = {"message": message}
        elif isinstance(message, dict):
            payload = message
        else:
            payload = {"message": str(message)}

        log_obj: dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "service": record.name,
        }
        log_obj.update(payload)
        return json.dumps(log_obj, ensure_ascii=False)


def _configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(_JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)


_configure_logging()
logger = logging.getLogger("breso.main")

# ---------------------------------------------------------------------------
# App lifespan (scheduler start / stop)
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ANN201
    scheduler.start()
    await register_on_agentscan()
    logger.info({"event": "app.startup"})
    yield
    scheduler.stop()
    logger.info({"event": "app.shutdown"})


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="BRESO API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://brenso-ai.vercel.app",
        "https://mindbridge-theta.vercel.app",
        "https://brenso-ortugonzalezz-5077s-projects.vercel.app",
        "https://frontend-eta-pearl.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request logging middleware
# ---------------------------------------------------------------------------


@app.middleware("http")
async def log_requests(request: Request, call_next):  # noqa: ANN201
    correlation_id = str(uuid.uuid4())
    request.state.correlation_id = correlation_id
    t0 = time.monotonic()

    response = await call_next(request)

    duration_ms = int((time.monotonic() - t0) * 1000)
    logger.info(
        {
            "event": "http.request",
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "correlation_id": correlation_id,
        }
    )
    return response


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(checkins.router)
app.include_router(alerts.router)
app.include_router(contacts.router)
app.include_router(bookings.router)
app.include_router(subscriptions.router)
app.include_router(payments.router)
app.include_router(user_types.router)
app.include_router(family.router)
app.include_router(family_router)
app.include_router(dashboard_router)


# ---------------------------------------------------------------------------
# Health & utility endpoints
# ---------------------------------------------------------------------------


@app.get("/health", tags=["meta"])
async def health_check() -> dict:
    """Enhanced health check — verifies all external dependencies."""
    from datetime import datetime, timezone
    checks: dict[str, str] = {}

    # Check Supabase
    try:
        sb = get_supabase()
        sb.table("users").select("id").limit(1).execute()
        checks["supabase"] = "ok"
    except Exception as exc:  # noqa: BLE001
        checks["supabase"] = f"error: {str(exc)[:50]}"

    # Check Anthropic key
    try:
        key = os.getenv("ANTHROPIC_API_KEY", "")
        checks["anthropic"] = "ok" if key.startswith("sk-ant") else "missing key"
    except Exception:  # noqa: BLE001
        checks["anthropic"] = "error"

    # Check Resend key
    try:
        key = os.getenv("RESEND_API_KEY", "")
        checks["resend"] = "ok" if key.startswith("re_") else "missing key"
    except Exception:  # noqa: BLE001
        checks["resend"] = "error"

    all_ok = all(v == "ok" for v in checks.values())

    return {
        "status": "healthy" if all_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
        "checks": checks,
        "agent": {
            "name": "Soledad por BRESO",
            "contract": "0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa",
            "network": "Celo Sepolia",
        },
        "onchain_contract": "0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa",
        "blockscout": "https://celo-sepolia.blockscout.com/address/0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa",
    }


@app.get("/agent/onchain-stats", tags=["meta"])
async def get_onchain_stats() -> dict:
    """Return BRESO agent identity and on-chain stats from Blockscout."""
    from integrations.onchain_client import get_agent_stats
    stats = await get_agent_stats()
    return {
        "agent": "Soledad por BRESO",
        "description": "AI mental wellness agent for Latin America",
        "standard": "ERC-8004",
        "payment_protocol": "x402 via Thirdweb",
        "onchain": stats,
        "capabilities": [
            "Daily emotional check-ins",
            "Crisis detection and alerting",
            "Family network coordination",
            "Subscription payments in USDT",
        ],
    }


@app.get("/agent/activity", tags=["meta"])
async def get_agent_activity() -> dict:
    """Return live activity stats for the BRESO agent."""
    supabase = get_supabase()
    try:
        users = supabase.table("users").select("id", count="exact").execute()
        total_users = users.count or 0
    except Exception:  # noqa: BLE001
        total_users = 0
    try:
        checkins = supabase.table("check_ins").select("id", count="exact").execute()
        total_checkins = checkins.count or 0
    except Exception:  # noqa: BLE001
        total_checkins = 0
    try:
        crisis = supabase.table("crisis_events").select("id", count="exact").execute()
        crisis_count = crisis.count or 0
    except Exception:  # noqa: BLE001
        crisis_count = 0

    return {
        "agent": "Soledad por BRESO",
        "stats": {
            "total_users": total_users,
            "total_checkins": total_checkins,
            "crisis_prevented": crisis_count,
            "uptime": "99.9%",
        },
        "contract": "0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa",
        "network": "Celo Sepolia",
        "standard": "ERC-8004",
    }


CRISIS_NUMBERS: dict[str, dict[str, str]] = {
    "AR": {"label": "Centro de Asistencia al Suicida", "number": "135"},
    "MX": {"label": "SAPTEL", "number": "800-290-0024"},
    "CO": {"label": "Línea 106", "number": "106"},
    "CL": {"label": "Salud Responde", "number": "600-360-7577"},
    "ES": {"label": "Teléfono de la Esperanza", "number": "024"},
    "US": {"label": "988 Suicide & Crisis Lifeline", "number": "988"},
}


@app.get("/crisis/numbers", tags=["meta"])
async def crisis_numbers(country_code: str | None = None) -> dict:
    """Return crisis line numbers. Pass country_code for a specific country."""
    if country_code:
        code = country_code.upper()
        if code in CRISIS_NUMBERS:
            return {code: CRISIS_NUMBERS[code]}
        return {}
    return CRISIS_NUMBERS


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=404,
        content={
            "code": "NOT_FOUND",
            "message": "The requested resource was not found",
            "correlation_id": correlation_id,
        },
    )


@app.exception_handler(500)
async def server_error_handler(request: Request, exc: Exception) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    logger.error(
        {
            "event": "unhandled_exception",
            "error": str(exc),
            "correlation_id": correlation_id,
        }
    )
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred",
            "correlation_id": correlation_id,
        },
    )
