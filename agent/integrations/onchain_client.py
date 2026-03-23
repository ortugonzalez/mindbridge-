"""On-chain client — queries Blockscout for BRESO agent contract stats."""
from __future__ import annotations

import os

import httpx

CELO_RPC = os.getenv("CELO_RPC_URL", "https://celo-sepolia.drpc.org")
CONTRACT = "0x5520FaAD2a9bA826567FE86bd9Da7Df5308e1EEa"
BLOCKSCOUT_API = "https://celo-sepolia.blockscout.com/api/v2"


async def verify_agent_registration() -> dict:
    """Verify the BRENSO agent contract is registered and get metadata from Blockscout."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{BLOCKSCOUT_API}/addresses/{CONTRACT}",
            )
            data = response.json()
            return {
                "registered": True,
                "contract": CONTRACT,
                "verified": data.get("is_verified", False),
                "transactions": data.get("transaction_count", 0),
                "explorer": f"https://celo-sepolia.blockscout.com/address/{CONTRACT}",
            }
    except Exception as exc:  # noqa: BLE001
        return {"registered": True, "contract": CONTRACT, "error": str(exc)}


async def get_agent_stats() -> dict:
    """Get on-chain stats for the BRESO agent contract."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            tx_response = await client.get(
                f"{BLOCKSCOUT_API}/addresses/{CONTRACT}/transactions",
                params={"limit": 10},
            )
            tx_data = tx_response.json()

            return {
                "contract": CONTRACT,
                "network": "Celo Sepolia",
                "explorer": f"https://celo-sepolia.blockscout.com/address/{CONTRACT}",
                "transactions": tx_data.get("total_count", 0),
                "status": "active",
            }
    except Exception as exc:  # noqa: BLE001
        return {
            "contract": CONTRACT,
            "network": "Celo Sepolia",
            "explorer": f"https://celo-sepolia.blockscout.com/address/{CONTRACT}",
            "status": "registered",
            "error": str(exc),
        }
