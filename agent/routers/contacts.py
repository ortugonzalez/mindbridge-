"""Contacts router — trusted contact invite management for patients."""
from __future__ import annotations

import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from integrations.email_client import send_contact_invite_email
from integrations.supabase_client import get_supabase
from routers.users import get_current_user

router = APIRouter(prefix="/contacts", tags=["contacts"])
logger = logging.getLogger("breso.contacts")

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "https://mindbridge-theta.vercel.app")


class ContactInviteBody(BaseModel):
    contact_email: str
    contact_name: str
    relationship: str = "otro"


@router.get("")
async def list_contacts(current_user=Depends(get_current_user)) -> list:
    """Return the current user's trusted contacts."""
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("user_relationships")
            .select("id, related_user_id, relationship_type, status, invite_token, created_at")
            .eq("patient_id", current_user.id)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "contacts.list.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch contacts") from exc

    # Enrich with contact display names
    result = []
    for row in rows:
        contact_info: dict = {}
        if row.get("related_user_id"):
            try:
                user_resp = (
                    supabase.table("users")
                    .select("display_name, email")
                    .eq("id", row["related_user_id"])
                    .single()
                    .execute()
                )
                contact_info = user_resp.data or {}
            except Exception:  # noqa: BLE001
                pass
        result.append({
            "id": row["id"],
            "contact_name": contact_info.get("display_name"),
            "contact_email": contact_info.get("email"),
            "relationship": row.get("relationship_type", "otro"),
            "status": row.get("status"),
            "created_at": row.get("created_at"),
        })

    return result


@router.post("/invite")
async def invite_contact(
    body: ContactInviteBody,
    current_user=Depends(get_current_user),
) -> dict:
    """
    Patient invites a trusted contact by email.
    Creates a pending relationship record and sends them an invite email.
    """
    supabase = get_supabase()

    # Fetch patient display name for the email
    try:
        patient_resp = (
            supabase.table("users")
            .select("display_name")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        patient_name = (patient_resp.data or {}).get("display_name") or "tu ser querido"
    except Exception:  # noqa: BLE001
        patient_name = "tu ser querido"

    invite_token = str(uuid.uuid4())
    invite_url = f"{FRONTEND_BASE_URL}/accept-invite/{invite_token}"

    try:
        supabase.table("user_relationships").insert({
            "patient_id": current_user.id,
            "relationship_type": body.relationship,
            "status": "pending_contact",
            "invite_token": invite_token,
        }).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "contacts.invite.insert_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to create invite") from exc

    # Send invite email to the contact immediately
    email_result = send_contact_invite_email(
        to_email=body.contact_email,
        to_name=body.contact_name,
        patient_name=patient_name,
        invite_url=invite_url,
    )

    logger.info({
        "event": "contacts.invite.sent",
        "patient_id": current_user.id,
        "contact_email": body.contact_email,
        "email_success": email_result.get("success"),
    })

    return {
        "success": True,
        "invite_token": invite_token,
        "invite_url": invite_url,
        "email_sent": email_result.get("success", False),
    }
