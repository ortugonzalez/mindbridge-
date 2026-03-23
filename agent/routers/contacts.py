"""Contacts router — stub for Phase 4. Full contact management in Phase 9."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from routers.users import get_current_user

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("")
async def list_contacts(current_user=Depends(get_current_user)) -> dict:
    """Stub — contact management coming in Phase 9."""
    return {"message": "Contact management coming in Phase 9"}


@router.post("")
async def create_contact(body: dict, current_user=Depends(get_current_user)) -> dict:
    """Stub — contact creation coming in Phase 9."""
    return {"message": "Contact creation coming in Phase 9"}
