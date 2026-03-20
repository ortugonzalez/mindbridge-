"""Payment routes — create subscription payment links and verify USDT payments."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from agent.integrations.supabase_client import get_supabase
from agent.integrations import x402_client
from agent.routers.users import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])
logger = logging.getLogger("breso.payments")

VALID_PLANS = {"essential", "premium"}


class CreateSubscriptionBody(BaseModel):
    plan: str  # "essential" | "premium"


class VerifyPaymentBody(BaseModel):
    payment_id: str
    plan: str


# ---------------------------------------------------------------------------
# POST /payments/create-subscription
# ---------------------------------------------------------------------------


@router.post("/create-subscription")
async def create_subscription(
    body: CreateSubscriptionBody,
    current_user=Depends(get_current_user),
) -> dict:
    """Create a Thirdweb x402 payment link for a subscription plan."""
    if body.plan not in VALID_PLANS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid plan. Valid options: {sorted(VALID_PLANS)}",
        )

    try:
        result = await x402_client.create_payment_link(
            plan=body.plan,
            user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "payments.create.error", "error": str(exc)})
        raise HTTPException(status_code=502, detail="Failed to create payment link") from exc

    return result


# ---------------------------------------------------------------------------
# POST /payments/verify
# ---------------------------------------------------------------------------


@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentBody,
    current_user=Depends(get_current_user),
) -> dict:
    """
    Verify a payment and, if confirmed, upgrade the user's plan in Supabase.
    """
    if body.plan not in VALID_PLANS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid plan. Valid options: {sorted(VALID_PLANS)}",
        )

    try:
        result = await x402_client.verify_payment(body.payment_id)
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "payments.verify.error", "error": str(exc)})
        raise HTTPException(status_code=502, detail="Payment verification failed") from exc

    if result.get("verified"):
        # Upgrade user plan
        supabase = get_supabase()
        try:
            supabase.table("users").update({"plan": body.plan}).eq("id", current_user.id).execute()
            # Record subscription
            supabase.table("subscriptions").insert(
                {
                    "user_id": current_user.id,
                    "tier": body.plan,
                    "status": "active",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "payment_tx_hash": result.get("tx_hash"),
                    "payment_amount_usdt": result.get("amount_usdt"),
                }
            ).execute()
        except Exception as exc:  # noqa: BLE001
            logger.error({"event": "payments.verify.db_error", "error": str(exc)})
            # Payment was verified — don't block the response, just log

        logger.info(
            {
                "event": "payments.verify.upgraded",
                "user_id": current_user.id,
                "plan": body.plan,
                "tx_hash": result.get("tx_hash"),
            }
        )

    return {
        "verified": result.get("verified", False),
        "plan": body.plan,
        "tx_hash": result.get("tx_hash"),
        "status": result.get("status"),
    }


# ---------------------------------------------------------------------------
# GET /payments/status
# ---------------------------------------------------------------------------


@router.get("/status")
async def payment_status(current_user=Depends(get_current_user)) -> dict:
    """Return the current user's subscription plan and trial status."""
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
        logger.error({"event": "payments.status.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch payment status") from exc

    trial_days_left: int | None = None
    if row.get("plan") == "free_trial" and row.get("trial_start"):
        try:
            trial_start = datetime.fromisoformat(row["trial_start"].replace("Z", "+00:00"))
            elapsed = (datetime.now(timezone.utc) - trial_start).days
            trial_days_left = max(0, 15 - elapsed)
        except Exception:  # noqa: BLE001
            pass

    return {
        "plan": row.get("plan", "free_trial"),
        "trial_days_left": trial_days_left,
    }
