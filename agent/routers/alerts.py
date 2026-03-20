"""Alerts router — stub for Phase 4. Full alert dispatch in Phase 7."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from routers.users import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(current_user=Depends(get_current_user)) -> list:
    """Returns empty list — full implementation in Phase 7."""
    return []
