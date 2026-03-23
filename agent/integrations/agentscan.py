"""AgentScan / ERC-8004 registration — register Soledad as an on-chain AI agent."""
from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger("breso.agentscan")

ERC8004_CONTRACT = os.environ.get(
    "ERC8004_CONTRACT_ADDRESS", "0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa"
)

AGENT_DATA = {
    "name": "Soledad por BRESO",
    "description": "AI mental wellness agent for Latin America. Detects emotional patterns, coordinates family support, and processes autonomous payments on Celo.",
    "contractAddress": ERC8004_CONTRACT,
    "network": "celo-sepolia",
    "category": "healthcare",
    "website": "https://mindbridge-theta.vercel.app",
    "github": "https://github.com/ortugonzalez/mindbridge-",
    "capabilities": [
        "daily-checkins",
        "crisis-detection",
        "family-alerts",
        "subscription-payments",
        "defi-cashback",
    ],
}

_ENDPOINTS = [
    "https://api.agentscan.info/agents/register",
    "https://agentscan.info/api/agents",
    "https://api.8004scan.io/agents/register",
]


async def register_on_agentscan() -> dict:
    """
    Register Soledad as an ERC-8004 AI agent on AgentScan.
    Tries multiple endpoints in order; safe to call on every startup (idempotent).
    """
    async with httpx.AsyncClient(timeout=10.0) as client:
        for endpoint in _ENDPOINTS:
            try:
                response = await client.post(
                    endpoint,
                    json=AGENT_DATA,
                    headers={"Content-Type": "application/json"},
                )
                if response.status_code in (200, 201, 409):
                    data = response.json() if response.content else {}
                    logger.info(
                        {
                            "event": "agentscan.registered",
                            "endpoint": endpoint,
                            "status": response.status_code,
                            "agent_id": data.get("id") or data.get("agentId"),
                        }
                    )
                    return data
                logger.warning(
                    {
                        "event": "agentscan.register_failed",
                        "endpoint": endpoint,
                        "status": response.status_code,
                        "body": response.text[:200],
                    }
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning(
                    {"event": "agentscan.register_error", "endpoint": endpoint, "error": str(exc)}
                )

    return {"status": "registration_attempted"}
