"""Subscriptions router."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from integrations.supabase_client import get_supabase
from routers.users import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])
logger = logging.getLogger("breso.subscriptions")


@router.get("/status")
async def subscription_status(current_user=Depends(get_current_user)) -> dict:
    """Return the current user's plan status and trial metadata."""
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("users")
            .select("plan, trial_start")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        row = resp.data or {}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "subscriptions.status.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch subscription status") from exc

    plan = row.get("plan", "free_trial")
    trial_days_left: int | None = None
    if plan == "free_trial" and row.get("trial_start"):
        try:
            trial_start = datetime.fromisoformat(row["trial_start"].replace("Z", "+00:00"))
            elapsed = (datetime.now(timezone.utc) - trial_start).days
            trial_days_left = max(0, 15 - elapsed)
        except Exception:  # noqa: BLE001
            trial_days_left = None

    return {
        "active": plan in {"essential", "premium"},
        "plan": plan,
        "trial_days_left": trial_days_left,
        "message": "Suscripción activa" if plan in {"essential", "premium"} else "En prueba gratuita",
    }
