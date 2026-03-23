"""Payment routes — subscriptions, webhook, plan catalogue."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from integrations.email_client import send_alert_email, send_welcome_email
from integrations.supabase_client import get_supabase
from integrations import x402_client
from integrations.defi_client import defi_cashback
from routers.users import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])
logger = logging.getLogger("breso.payments")

VALID_PLANS = {"essential", "premium"}

PLAN_PRICES_USD = {
    "essential": 5.00,
    "premium": 12.00,
}

PLANS_CATALOGUE = [
    {
        "id": "free_trial",
        "name": "Prueba gratuita",
        "price_usd": 0.00,
        "price_usdt": 0.00,
        "display_price": "Gratis — 15 días",
        "billing_note": None,
        "trial_days": 15,
        "features": [
            "1 check-in diario",
            "Historial 30 días",
            "1 contacto de confianza",
        ],
    },
    {
        "id": "essential",
        "name": "Esencial",
        "price_usd": 5.00,
        "price_usdt": 5.00,
        "display_price": "$5 USD / mes",
        "billing_note": "Procesado en USDT sobre Celo blockchain",
        "trial_days": None,
        "features": [
            "Check-ins ilimitados",
            "Historial completo",
            "1 contacto de confianza",
            "Propuestas personalizadas",
        ],
    },
    {
        "id": "premium",
        "name": "Premium",
        "price_usd": 12.00,
        "price_usdt": 12.00,
        "display_price": "$12 USD / mes",
        "billing_note": "Procesado en USDT sobre Celo blockchain",
        "trial_days": None,
        "features": [
            "Todo lo esencial",
            "2 contactos de confianza",
            "Coordinación profesional",
            "Reporte mensual",
        ],
    },
]


class CreateSubscriptionBody(BaseModel):
    plan: str


class VerifyPaymentBody(BaseModel):
    payment_id: str
    plan: str


# ---------------------------------------------------------------------------
# GET /payments/plans
# ---------------------------------------------------------------------------


@router.get("/plans")
async def get_plans() -> dict:
    """Return the available subscription plans with USD prices and features."""
    return {"plans": PLANS_CATALOGUE}


# ---------------------------------------------------------------------------
# GET /payments/usd-to-usdt
# ---------------------------------------------------------------------------


@router.get("/usd-to-usdt")
async def usd_to_usdt(amount: float = 1.0) -> dict:
    """
    Convert a USD amount to USDT.
    Uses a fixed 1:1 rate (Mento stablecoin peg).
    """
    rate = 1.0
    return {
        "usd": round(amount, 2),
        "usdt": round(amount * rate, 2),
        "rate": rate,
    }


# ---------------------------------------------------------------------------
# POST /payments/create-subscription
# ---------------------------------------------------------------------------


@router.post("/create-subscription")
async def create_subscription(
    body: CreateSubscriptionBody,
    current_user=Depends(get_current_user),
) -> dict:
    """Create a Thirdweb Pay link for a subscription plan and store DeFi cashback promise."""
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

    amount_usd = PLAN_PRICES_USD.get(body.plan, 0.0)
    cashback = await defi_cashback.process_subscription_with_defi(
        user_id=current_user.id,
        amount_usd=amount_usd,
        plan=body.plan,
    )

    return {**result, "cashback": cashback}


# ---------------------------------------------------------------------------
# GET /payments/my-cashback
# ---------------------------------------------------------------------------


@router.get("/defi-stats")
async def defi_stats() -> dict:
    """Return global DeFi protocol stats for display in the UI."""
    return {
        "protocol": "Mento Protocol on Celo",
        "network": "Celo Mainnet",
        "apy": "5% annual",
        "cashback_rate": "2% monthly of subscription",
        "total_subscriptions_staked_usd": 0,
        "description": "Subscriptions generate yield via Mento stablecoin pools on Celo. 30% of monthly yield is returned as cashback to subscribers.",
        "contract": "0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa",
        "explorer": "https://celo-sepolia.blockscout.com/address/0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa",
    }


@router.get("/my-cashback")
async def my_cashback(current_user=Depends(get_current_user)) -> dict:
    """Return pending cashback for the current user."""
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("user_cashbacks")
            .select("*")
            .eq("user_id", current_user.id)
            .eq("status", "pending")
            .order("created_at", desc=True)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "payments.my_cashback.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch cashback") from exc

    total_pending = sum(float(r.get("cashback_amount") or 0) for r in rows)
    return {
        "cashbacks": rows,
        "total_pending_usd": round(total_pending, 4),
    }


# ---------------------------------------------------------------------------
# POST /payments/verify  (manual client-side verification)
# ---------------------------------------------------------------------------


@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentBody,
    current_user=Depends(get_current_user),
) -> dict:
    """Manually verify a payment by ID and upgrade plan if confirmed."""
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
        _upgrade_user_plan(current_user.id, body.plan, result.get("tx_hash"), result.get("amount_usdt"))

    return {
        "verified": result.get("verified", False),
        "plan": body.plan,
        "tx_hash": result.get("tx_hash"),
        "status": result.get("status"),
    }


# ---------------------------------------------------------------------------
# POST /payments/webhook  (Thirdweb server-to-server confirmation)
# ---------------------------------------------------------------------------


@router.post("/webhook")
async def payment_webhook(
    request: Request,
    x_thirdweb_signature: str = Header(default=""),
) -> dict:
    """
    Receive Thirdweb payment confirmation webhook.
    Verifies signature, upgrades user plan, and sends confirmation email.
    """
    payload_bytes = await request.body()

    # Verify webhook authenticity only when a secret key is configured
    import os
    has_secret = bool(os.getenv("THIRDWEB_SECRET_KEY", ""))
    if has_secret and not x402_client.verify_webhook_signature(payload_bytes, x_thirdweb_signature):
        logger.warning({"event": "payments.webhook.invalid_signature"})
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        import json
        data = json.loads(payload_bytes)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    status = data.get("status", "")
    if status not in ("completed", "paid", "confirmed", "success"):
        # Acknowledge non-final events without processing
        return {"received": True, "processed": False, "status": status}

    metadata = data.get("metadata") or {}
    plan = metadata.get("plan")
    user_id = metadata.get("user_id")
    tx_hash = data.get("txHash") or data.get("transactionHash")
    amount_usdt = data.get("amount")

    if not plan or not user_id:
        logger.warning({"event": "payments.webhook.missing_metadata", "data": str(data)[:200]})
        raise HTTPException(status_code=422, detail="Missing plan or user_id in metadata")

    if plan not in VALID_PLANS:
        raise HTTPException(status_code=422, detail=f"Unknown plan: {plan}")

    _upgrade_user_plan(user_id, plan, tx_hash, amount_usdt)

    logger.info(
        {
            "event": "payments.webhook.processed",
            "user_id": user_id,
            "plan": plan,
            "tx_hash": tx_hash,
        }
    )
    return {"received": True, "processed": True, "plan": plan}


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


# ---------------------------------------------------------------------------
# POST /payments/cancel-subscription
# ---------------------------------------------------------------------------


@router.post("/cancel-subscription")
async def cancel_subscription(current_user=Depends(get_current_user)) -> dict:
    """
    Cancel the current user's subscription.
    Resets plan to free_trial with a fresh trial_start so they retain access
    through the current billing period (reflected as a new 15-day window).
    """
    supabase = get_supabase()
    try:
        supabase.table("users").update({
            "plan": "free_trial",
            "trial_start": datetime.now(timezone.utc).isoformat(),
        }).eq("id", current_user.id).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "payments.cancel_subscription.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to cancel subscription") from exc

    logger.info({"event": "payments.cancel_subscription.success", "user_id": current_user.id})
    return {
        "success": True,
        "message": "Suscripción cancelada. Seguís teniendo acceso hasta fin del período.",
    }


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------


def _upgrade_user_plan(
    user_id: str,
    plan: str,
    tx_hash: str | None,
    amount_usdt: float | None,
) -> None:
    """Update user plan in Supabase and record the subscription row."""
    supabase = get_supabase()
    try:
        supabase.table("users").update({"plan": plan}).eq("id", user_id).execute()
        supabase.table("subscriptions").insert(
            {
                "user_id": user_id,
                "tier": plan,
                "status": "active",
                "started_at": datetime.now(timezone.utc).isoformat(),
                "payment_tx_hash": tx_hash,
                "payment_amount_usdt": amount_usdt,
            }
        ).execute()
        logger.info({"event": "payments.plan_upgraded", "user_id": user_id, "plan": plan})

        # Send plan confirmation email
        try:
            user_res = supabase.table("users").select("email, display_name").eq("id", user_id).single().execute()
            if user_res.data and user_res.data.get("email"):
                send_welcome_email(
                    to_email=user_res.data["email"],
                    user_name=user_res.data.get("display_name") or "amigo/a",
                )
        except Exception as email_exc:  # noqa: BLE001
            logger.warning({"event": "payments.welcome_email_failed", "error": str(email_exc)})
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "payments.upgrade_db_error", "error": str(exc), "user_id": user_id})
