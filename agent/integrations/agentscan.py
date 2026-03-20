"""AgentScan / ERC-8004 registration — register Soledad as an on-chain AI agent."""
from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger("breso.agentscan")

AGENTSCAN_API = "https://api.8004scan.io"
ERC8004_CONTRACT = os.environ.get(
    "ERC8004_CONTRACT", "0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa"
)

AGENT_NAME = "Soledad by BRESO"
AGENT_TYPE = "mental-wellness-companion"
AGENT_METADATA_URI = os.environ.get(
    "AGENT_METADATA_URI", "https://breso.app/agent-metadata.json"
)


async def register_on_agentscan() -> None:
    """
    Register Soledad as an ERC-8004 AI agent on AgentScan.
    Safe to call on every startup — the API is idempotent on agent name + contract.
    """
    payload = {
        "contract": ERC8004_CONTRACT,
        "name": AGENT_NAME,
        "agentType": AGENT_TYPE,
        "metadataUri": AGENT_METADATA_URI,
        "network": "celo-sepolia",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                f"{AGENTSCAN_API}/agents/register",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code in (200, 201, 409):  # 409 = already registered
                data = resp.json() if resp.content else {}
                logger.info(
                    {
                        "event": "agentscan.registered",
                        "agent": AGENT_NAME,
                        "status": resp.status_code,
                        "agent_id": data.get("id") or data.get("agentId"),
                    }
                )
            else:
                logger.warning(
                    {
                        "event": "agentscan.register_failed",
                        "status": resp.status_code,
                        "body": resp.text[:200],
                    }
                )
    except Exception as exc:  # noqa: BLE001
        # Non-fatal — app continues to run even if AgentScan is unreachable
        logger.warning({"event": "agentscan.register_error", "error": str(exc)})
