"""Bookings router - professional decision support and availability."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException

from integrations.supabase_client import get_supabase
from routers.users import get_current_user

router = APIRouter(prefix="/bookings", tags=["bookings"])
logger = logging.getLogger("breso.bookings")


@router.get("/decision-tree")
async def decision_tree(current_user=Depends(get_current_user)) -> dict:
    """Return a privacy-safe recommendation and available professionals."""
    supabase = get_supabase()
    try:
        user_resp = (
            supabase.table("users")
            .select("alert_level, language, plan, user_type, display_name")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        user_row = user_resp.data or {}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "bookings.decision_tree.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch user context") from exc

    try:
        pro_resp = (
            supabase.table("mental_health_professionals")
            .select("id, name, language, region, consultation_rate_usdt, available, contact_info")
            .eq("available", True)
            .execute()
        )
        professionals = pro_resp.data or []
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail="Failed to fetch professionals") from exc

    level = user_row.get("alert_level") or "green"
    recommendation = {
        "red": "Te recomendamos buscar acompañamiento profesional lo antes posible.",
        "orange": "Puede ser un buen momento para coordinar una consulta profesional.",
        "yellow": "Podría ayudarte hablar con un profesional si querés apoyo adicional.",
        "green": "No vemos urgencia, pero podés coordinar una consulta preventiva si te sirve.",
    }.get(level, "Podés coordinar una consulta si necesitás apoyo adicional.")

    plan = user_row.get("plan", "free_trial")
    recommended_action = (
        "Tu plan actual permite coordinación profesional básica."
        if plan in {"essential", "premium"}
        else "Podés revisar planes para habilitar coordinación profesional."
    )

    return {
        "alert_level": level,
        "recommended": level in {"orange", "red"},
        "message": recommendation,
        "recommended_action": recommended_action,
        "professionals": professionals[:5],
    }
