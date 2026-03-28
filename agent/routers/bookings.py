"""Bookings router."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from integrations.supabase_client import get_supabase
from routers.users import get_current_user

router = APIRouter(prefix="/bookings", tags=["bookings"])
logger = logging.getLogger("breso.bookings")


@router.get("/decision-tree")
async def decision_tree(current_user=Depends(get_current_user)) -> dict:
    """Return a lightweight professional-coordination recommendation tree."""
    supabase = get_supabase()
    try:
        user_resp = (
            supabase.table("users")
            .select("alert_level, language")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        user_row = user_resp.data or {}

        professionals_resp = (
            supabase.table("mental_health_professionals")
            .select("id, name, language, region, consultation_rate_usdt, available, contact_info")
            .eq("available", True)
            .limit(5)
            .execute()
        )
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "bookings.decision_tree.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to build booking guidance") from exc

    level = user_row.get("alert_level") or "green"
    recommendation = {
        "red": "Te recomendamos buscar acompañamiento profesional lo antes posible.",
        "orange": "Puede ser un buen momento para coordinar una consulta profesional.",
        "yellow": "Podría ayudarte hablar con un profesional si querés apoyo adicional.",
        "green": "No vemos urgencia, pero podés coordinar una consulta preventiva si te sirve.",
    }.get(level, "Podés coordinar una consulta si necesitás apoyo adicional.")

    return {
        "alert_level": level,
        "recommended": level in {"orange", "red"},
        "message": recommendation,
        "professionals": professionals_resp.data or [],
    }
