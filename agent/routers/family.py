"""Family routes — invite management for family users."""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from integrations.email_client import send_invite_email
from integrations.supabase_client import get_supabase
from routers.users import get_current_user

router = APIRouter(prefix="/family", tags=["family"])
logger = logging.getLogger("breso.family")

FRONTEND_BASE_URL = os.getenv(
    "FRONTEND_BASE_URL", "https://mindbridge-theta.vercel.app"
)


class SendInviteBody(BaseModel):
    patient_email: str


@router.post("/send-invite")
async def send_invite(
    body: SendInviteBody,
    current_user=Depends(get_current_user),
) -> dict:
    """
    Create or refresh an invite link for a family user and email it to the patient.
    The family user must be logged in. Creates a pending_patient relationship if
    one doesn't exist yet, then sends the invite link by email.
    """
    supabase = get_supabase()

    # Verify the caller is a family user
    try:
        user_resp = (
            supabase.table("users")
            .select("user_type, display_name")
            .eq("id", current_user.id)
            .single()
            .execute()
        )
        user_row = user_resp.data or {}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "family.send_invite.user_lookup_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch user profile") from exc

    if user_row.get("user_type") != "family":
        raise HTTPException(
            status_code=403,
            detail="Only family users can send invites",
        )

    family_name: str = user_row.get("display_name") or "Tu familiar"

    # Look for an existing pending invite for this family user
    invite_token: str | None = None
    try:
        existing = (
            supabase.table("user_relationships")
            .select("id, invite_token")
            .eq("related_user_id", current_user.id)
            .eq("status", "pending_patient")
            .limit(1)
            .execute()
        )
        rows = existing.data or []
        if rows:
            invite_token = rows[0].get("invite_token")
            rel_id = rows[0]["id"]
        else:
            invite_token = None
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "family.send_invite.lookup_error", "error": str(exc)})

    if not invite_token:
        # Create a new relationship with a fresh token
        invite_token = str(uuid.uuid4())
        try:
            insert_resp = (
                supabase.table("user_relationships")
                .insert(
                    {
                        "related_user_id": current_user.id,
                        "relationship_type": "family",
                        "status": "pending_patient",
                        "invite_token": invite_token,
                    }
                )
                .execute()
            )
        except Exception as exc:  # noqa: BLE001
            logger.error({"event": "family.send_invite.insert_error", "error": str(exc)})
            raise HTTPException(status_code=500, detail="Failed to create invite") from exc

    invite_link = f"{FRONTEND_BASE_URL}/accept-invite/{invite_token}"

    # Mark invite as sent
    try:
        supabase.table("user_relationships").update(
            {"invite_sent_at": datetime.now(timezone.utc).isoformat()}
        ).eq("invite_token", invite_token).execute()
    except Exception:  # noqa: BLE001
        pass

    # Send the email (non-blocking on failure)
    email_result = send_invite_email(
        to_email=body.patient_email,
        family_name=family_name,
        invite_link=invite_link,
    )

    logger.info(
        {
            "event": "family.send_invite.sent",
            "family_user_id": current_user.id,
            "patient_email": body.patient_email,
            "email_success": email_result.get("success"),
        }
    )

    return {
        "invite_link": invite_link,
        "invite_token": invite_token,
        "email_sent": email_result.get("success", False),
        "patient_email": body.patient_email,
    }
