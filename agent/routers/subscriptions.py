"""Subscriptions router - subscription status and billing snapshot."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from integrations.supabase_client import get_supabase
from routers.users import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/status")
async def subscription_status(current_user=Depends(get_current_user)) -> dict:
    """Return the current user's subscription and trial status."""
    supabase = get_supabase()
    try:
        user_resp = (
            supabase.table("users")
            .select("plan, trial_start")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        user_row = user_resp.data or {}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to fetch subscription status") from exc

    subscription_row: dict = {}
    try:
        sub_resp = (
            supabase.table("subscriptions")
            .select("tier, status, started_at, expires_at, payment_tx_hash, payment_amount_usdt, auto_renew")
            .eq("user_id", current_user.id)
            .order("started_at", desc=True)
            .limit(1)
            .execute()
        )
        if sub_resp.data:
            subscription_row = sub_resp.data[0]
    except Exception:
        subscription_row = {}

    trial_days_left: int | None = None
    if user_row.get("plan") == "free_trial" and user_row.get("trial_start"):
        try:
            trial_start = datetime.fromisoformat(user_row["trial_start"].replace("Z", "+00:00"))
            elapsed = (datetime.now(timezone.utc) - trial_start).days
            trial_days_left = max(0, 15 - elapsed)
        except Exception:  # noqa: BLE001
            trial_days_left = None

    plan = user_row.get("plan") or subscription_row.get("tier") or "free_trial"
    status = subscription_row.get("status") or ("active" if plan != "free_trial" else "trial")

    return {
        "active": plan in {"essential", "premium"} and status == "active",
        "plan": plan,
        "status": status,
        "trial_days_left": trial_days_left,
        "started_at": subscription_row.get("started_at") or user_row.get("trial_start"),
        "expires_at": subscription_row.get("expires_at"),
        "payment_tx_hash": subscription_row.get("payment_tx_hash"),
        "payment_amount_usdt": subscription_row.get("payment_amount_usdt"),
        "auto_renew": subscription_row.get("auto_renew", True),
    }
