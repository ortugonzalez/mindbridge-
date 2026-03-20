"""x402 Thirdweb payment client — create payment links and verify USDT payments on Celo."""
from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger("breso.x402")

# Thirdweb x402 config
THIRDWEB_CLIENT_ID = os.environ.get("THIRDWEB_CLIENT_ID", "")
CELO_CHAIN_ID = 11142220  # Celo Sepolia testnet
USDT_CONTRACT = os.environ.get("CELO_USDT_CONTRACT", "")

PLAN_PRICES: dict[str, float] = {
    "essential": 5.0,
    "premium": 12.0,
}

X402_API_BASE = "https://api.x402.org/v1"


async def create_payment_link(plan: str, user_id: str) -> dict:
    """
    Create a Thirdweb x402 payment link for the given subscription plan.
    Returns: { payment_id, payment_url, amount_usdt, plan }
    """
    amount = PLAN_PRICES.get(plan)
    if amount is None:
        raise ValueError(f"Unknown plan: {plan!r}. Valid plans: {list(PLAN_PRICES)}")

    payload = {
        "clientId": THIRDWEB_CLIENT_ID,
        "chainId": CELO_CHAIN_ID,
        "token": USDT_CONTRACT,
        "amount": str(amount),
        "metadata": {
            "plan": plan,
            "user_id": user_id,
        },
        "redirectUrl": os.environ.get("PAYMENT_REDIRECT_URL", "https://app.breso.app/dashboard"),
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{X402_API_BASE}/payment-links",
            json=payload,
            headers={"x-client-id": THIRDWEB_CLIENT_ID},
        )
        resp.raise_for_status()
        data = resp.json()

    logger.info(
        {
            "event": "x402.payment_link.created",
            "user_id": user_id,
            "plan": plan,
            "payment_id": data.get("id"),
        }
    )
    return {
        "payment_id": data.get("id"),
        "payment_url": data.get("url") or data.get("paymentUrl"),
        "amount_usdt": amount,
        "plan": plan,
    }


async def verify_payment(payment_id: str) -> dict:
    """
    Verify a Thirdweb x402 payment by ID.
    Returns: { verified: bool, tx_hash, plan, user_id, amount_usdt }
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            f"{X402_API_BASE}/payment-links/{payment_id}",
            headers={"x-client-id": THIRDWEB_CLIENT_ID},
        )
        resp.raise_for_status()
        data = resp.json()

    status = data.get("status", "")
    verified = status in ("completed", "paid", "confirmed")

    logger.info(
        {
            "event": "x402.payment.verified" if verified else "x402.payment.pending",
            "payment_id": payment_id,
            "status": status,
        }
    )
    return {
        "verified": verified,
        "tx_hash": data.get("txHash") or data.get("transactionHash"),
        "plan": (data.get("metadata") or {}).get("plan"),
        "user_id": (data.get("metadata") or {}).get("user_id"),
        "amount_usdt": data.get("amount"),
        "status": status,
    }
