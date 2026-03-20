"""BRESO API — FastAPI application entry point."""
from __future__ import annotations

import json
import logging
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
from routers import alerts, auth, bookings, checkins, contacts, payments, subscriptions, user_types, users
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
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
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


# ---------------------------------------------------------------------------
# Health & utility endpoints
# ---------------------------------------------------------------------------


@app.get("/health", tags=["meta"])
async def health() -> dict:
    """Public health check — verifies Supabase connection."""
    supabase_status = "connected"
    try:
        get_supabase()
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "health.supabase_error", "error": str(exc)})
        supabase_status = "unavailable"

    return {"status": "ok", "version": "1.0.0", "supabase": supabase_status}


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
