"""Self Protocol integration — age/identity verification via ZK proofs."""
from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger("breso.self_protocol")

SELF_APP_ID = os.getenv("SELF_PROTOCOL_APP_ID", "")
SELF_SCOPE = "age_verification"

SELF_CONFIG = {
    "appName": "BRENSO",
    "scope": SELF_SCOPE,
    "requirements": {
        "minimumAge": 18,
        "excludedCountries": [],
        "ofac": False,
    },
    "devMode": True,  # Use testnet for hackathon
}


async def create_verification_request(user_id: str) -> dict:
    """Create a Self Protocol verification request."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.self.xyz/v1/verification/create",
                headers={
                    "Authorization": f"Bearer {SELF_APP_ID}",
                    "Content-Type": "application/json",
                },
                json={
                    "userId": user_id,
                    "appName": "BRENSO",
                    "scope": SELF_SCOPE,
                    "callbackUrl": f"{os.getenv('FRONTEND_URL', '')}/verify-identity",
                },
            )
            return response.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "self_protocol.create.fallback", "error": str(exc)})
        return {
            "error": str(exc),
            "qrCode": "https://app.ai.self.xyz/verify?app=brenso",
            "verificationId": "demo-" + user_id[:8],
        }


async def verify_proof(verification_id: str, proof: str) -> dict:
    """Verify a Self Protocol ZK proof."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.self.xyz/v1/verification/verify",
                headers={
                    "Authorization": f"Bearer {SELF_APP_ID}",
                    "Content-Type": "application/json",
                },
                json={
                    "verificationId": verification_id,
                    "proof": proof,
                },
            )
            return response.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "self_protocol.verify.error", "error": str(exc)})
        return {"verified": False, "error": str(exc)}
