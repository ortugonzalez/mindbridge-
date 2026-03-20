"""Bookings router — stub. Professional coordination in Phase 8."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from agent.routers.users import get_current_user

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.get("/decision-tree")
async def decision_tree(current_user=Depends(get_current_user)) -> dict:
    """Stub — professional coordination coming in Phase 8."""
    return {"message": "Professional coordination coming in Phase 8"}
