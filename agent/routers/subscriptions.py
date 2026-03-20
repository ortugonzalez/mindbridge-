"""Subscriptions router — stub. Full subscription management in Phase 6."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from routers.users import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])


@router.get("/status")
async def subscription_status(current_user=Depends(get_current_user)) -> dict:
    """Stub — subscription management coming in Phase 6."""
    return {"active": False, "message": "Subscription management coming in Phase 6"}
