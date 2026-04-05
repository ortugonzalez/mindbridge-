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
            supabase.table("trusted_contacts")
            .select("id, contact_email, relationship_label, active, created_at")
            .eq("user_id", current_user.id)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "contacts.list.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch contacts") from exc

    return [
        {
            "id": row["id"],
            "contact_name": row.get("contact_email", "").split("@")[0] or row.get("contact_email"),
            "contact_email": row.get("contact_email"),
            "relationship": row.get("relationship_label", "otro"),
            "status": "active" if row.get("active") else "pending",
            "created_at": row.get("created_at"),
        }
        for row in rows
    ]


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

    try:
        insert_resp = supabase.table("trusted_contacts").insert({
            "user_id": current_user.id,
            "contact_email": body.contact_email,
            "relationship_label": body.relationship,
            "alert_threshold": "moderate",
            "active": False,
        }).execute()
        contact = insert_resp.data[0] if insert_resp.data else {}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "contacts.invite.insert_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to create invite") from exc

    invite_url = f"{FRONTEND_BASE_URL}/signin?type=family&email={body.contact_email}"

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
        "contact_id": contact.get("id"),
        "invite_url": invite_url,
        "email_sent": email_result.get("success", False),
    }
