"""x402 HTTP 402 Payment Required middleware for BRESO subscriptions."""
from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger("breso.x402_middleware")

THIRDWEB_CLIENT_ID = os.getenv("THIRDWEB_CLIENT_ID", "")
CELO_SEPOLIA_CHAIN_ID = 44787
USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"
AGENT_WALLET = os.getenv("BRESO_AGENT_WALLET_ADDRESS", "")
SUBSCRIPTION_PRICE_USDT = "5000000"  # 5 USDT in 6 decimals

PAYMENT_REQUIRED_RESPONSE = {
    "x402Version": 1,
    "accepts": [{
        "scheme": "exact",
        "network": "celo-sepolia",
        "maxAmountRequired": SUBSCRIPTION_PRICE_USDT,
        "resource": "https://mindbridge-production-c766.up.railway.app/checkins/respond",
        "description": "BRESO monthly subscription - powered by Soledad AI",
        "mimeType": "application/json",
        "payTo": AGENT_WALLET,
        "maxTimeoutSeconds": 300,
        "asset": USDT_ADDRESS,
        "extra": {
            "name": "BRESO Subscription",
            "version": "1",
        },
    }],
    "error": "X402PaymentRequired",
}


async def verify_x402_payment(payment_header: str) -> bool:
    """Verify x402 payment via Thirdweb facilitator."""
    if not payment_header:
        return False
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://bridge.thirdweb.com/v1/x402/verify",
                headers={
                    "x-client-id": THIRDWEB_CLIENT_ID,
                    "Content-Type": "application/json",
                },
                json={
                    "payment": payment_header,
                    "paymentRequirements": PAYMENT_REQUIRED_RESPONSE["accepts"][0],
                },
                timeout=10.0,
            )
            data = response.json()
            is_valid = bool(data.get("isValid", False))
            logger.info({"event": "x402.verify.result", "is_valid": is_valid})
            return is_valid
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "x402.verify.error", "error": str(exc)})
        return False
