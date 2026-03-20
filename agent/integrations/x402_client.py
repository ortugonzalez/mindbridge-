"""x402 Thirdweb payment client — USDT subscription payments on Celo Sepolia."""
from __future__ import annotations

import hashlib
import hmac
import logging
import os

import httpx

logger = logging.getLogger("breso.x402")

THIRDWEB_CLIENT_ID = os.environ.get("THIRDWEB_CLIENT_ID", "")
THIRDWEB_SECRET_KEY = os.environ.get("THIRDWEB_SECRET_KEY", "")
CELO_CHAIN_ID = 11142220  # Celo Sepolia testnet
USDT_CONTRACT = os.environ.get("USDT_CONTRACT_ADDRESS", "")
PAYMENT_REDIRECT_URL = os.environ.get("PAYMENT_REDIRECT_URL", "https://app.breso.app/dashboard")

PLAN_PRICES: dict[str, float] = {
    "essential": 5.0,
    "premium": 12.0,
}

# Thirdweb Pay / x402 base URL
_THIRDWEB_PAY_BASE = "https://pay.thirdweb.com/v1"
_THIRDWEB_API_BASE = "https://api.thirdweb.com/v1"


def _auth_headers() -> dict:
    return {
        "x-client-id": THIRDWEB_CLIENT_ID,
        "x-secret-key": THIRDWEB_SECRET_KEY,
        "Content-Type": "application/json",
    }


async def create_payment_link(plan: str, user_id: str) -> dict:
    """
    Create a Thirdweb Pay intent for a USDT subscription payment on Celo.
    Returns: { payment_id, payment_url, amount_usdt, plan }
    """
    amount = PLAN_PRICES.get(plan)
    if amount is None:
        raise ValueError(f"Unknown plan: {plan!r}. Valid plans: {list(PLAN_PRICES)}")

    payload = {
        "clientId": THIRDWEB_CLIENT_ID,
        "chainId": CELO_CHAIN_ID,
        "tokenAddress": USDT_CONTRACT,
        "amount": str(amount),
        "metadata": {
            "plan": plan,
            "user_id": user_id,
        },
        "successUrl": f"{PAYMENT_REDIRECT_URL}?plan={plan}&payment=success",
        "cancelUrl": f"{PAYMENT_REDIRECT_URL}?payment=cancelled",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{_THIRDWEB_PAY_BASE}/payment-links",
                json=payload,
                headers=_auth_headers(),
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error(
            {
                "event": "x402.create.http_error",
                "status": exc.response.status_code,
                "body": exc.response.text[:300],
            }
        )
        raise

    payment_id = data.get("id") or data.get("paymentId")
    payment_url = data.get("url") or data.get("paymentUrl") or data.get("link")

    logger.info(
        {
            "event": "x402.payment_link.created",
            "user_id": user_id,
            "plan": plan,
            "payment_id": payment_id,
        }
    )
    return {
        "payment_id": payment_id,
        "payment_url": payment_url,
        "amount_usdt": amount,
        "plan": plan,
    }


async def verify_payment(payment_id: str) -> dict:
    """
    Verify a Thirdweb Pay payment by ID.
    Returns: { verified: bool, tx_hash, plan, user_id, amount_usdt, status }
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{_THIRDWEB_PAY_BASE}/payment-links/{payment_id}",
                headers=_auth_headers(),
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.error(
            {
                "event": "x402.verify.http_error",
                "status": exc.response.status_code,
                "payment_id": payment_id,
            }
        )
        raise

    status = data.get("status", "")
    verified = status in ("completed", "paid", "confirmed", "success")
    metadata = data.get("metadata") or {}

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
        "plan": metadata.get("plan"),
        "user_id": metadata.get("user_id"),
        "amount_usdt": data.get("amount"),
        "status": status,
    }


def verify_webhook_signature(payload_bytes: bytes, signature: str) -> bool:
    """
    Verify a Thirdweb webhook signature using HMAC-SHA256.
    The secret used is THIRDWEB_SECRET_KEY.
    """
    if not THIRDWEB_SECRET_KEY or not signature:
        return False
    expected = hmac.new(
        THIRDWEB_SECRET_KEY.encode(),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    # Thirdweb sends "sha256=<hex>" or just the raw hex
    incoming = signature.replace("sha256=", "")
    return hmac.compare_digest(expected, incoming)
