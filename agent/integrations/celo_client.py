"""Celo blockchain client — stub for Phase 1-4. Full implementation in Phase 9."""
import logging
import os

logger = logging.getLogger("breso.celo")


def send_consent_event(
    user_id_hash: str,
    payload_hash: str,
    threshold: str,
    contact_wallet: str,
) -> str | None:
    logger.info(
        {
            "event": "consent.on_chain.stub",
            "user_id_hash": user_id_hash,
            "threshold": threshold,
        }
    )
    return None  # Returns tx_hash when implemented


def send_payment(to: str, amount_usdt: float) -> str | None:
    logger.info({"event": "payment.stub", "to": to, "amount_usdt": amount_usdt})
    return None


def get_transaction_status(tx_hash: str) -> str:
    return "pending"
