"""DeFi cashback integration — simulates yield-based cashback for subscriptions."""
from __future__ import annotations

import logging
import os

logger = logging.getLogger("breso.defi")

CELO_RPC = os.getenv("CELO_RPC_URL", "https://celo-sepolia.drpc.org")


class DeFiCashback:
    """
    Basic DeFi cashback system.
    When user pays subscription, a portion goes to
    generate yield. At month end, 30% of yield is
    credited as cashback for next subscription.

    For hackathon: simulates the flow with mock yield
    Real implementation: integrate with Mento/Ubeswap
    """

    MONTHLY_YIELD_RATE = 0.05   # 5% annual = ~0.4% monthly
    CASHBACK_PERCENTAGE = 0.30  # 30% of yield back to user

    def calculate_cashback(self, amount_usd: float) -> dict:
        monthly_yield = amount_usd * self.MONTHLY_YIELD_RATE / 12
        cashback = monthly_yield * self.CASHBACK_PERCENTAGE
        return {
            "subscription_amount": amount_usd,
            "yield_generated": round(monthly_yield, 4),
            "cashback_usd": round(cashback, 4),
            "cashback_percentage": 30,
            "valid_for": "próxima suscripción",
        }

    async def process_subscription_with_defi(
        self, user_id: str, amount_usd: float, plan: str
    ) -> dict:
        """
        In production: deposit to Mento yield vault
        For hackathon: calculate and store cashback promise
        """
        from agent.integrations.supabase_client import get_supabase

        supabase = get_supabase()
        cashback_info = self.calculate_cashback(amount_usd)

        try:
            supabase.table("user_cashbacks").upsert(
                {
                    "user_id": user_id,
                    "plan": plan,
                    "subscription_amount": amount_usd,
                    "yield_generated": cashback_info["yield_generated"],
                    "cashback_amount": cashback_info["cashback_usd"],
                    "status": "pending",
                    "expires_at": "now() + interval '30 days'",
                }
            ).execute()
            logger.info(
                {
                    "event": "defi.cashback.stored",
                    "user_id": user_id,
                    "cashback_usd": cashback_info["cashback_usd"],
                }
            )
        except Exception as exc:  # noqa: BLE001
            logger.error({"event": "defi.cashback.store_error", "error": str(exc)})

        return cashback_info


defi_cashback = DeFiCashback()
