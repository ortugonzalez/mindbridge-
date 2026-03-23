"""User relationship routes — invitations, patient networks, support networks."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from integrations.supabase_client import get_supabase
from routers.users import get_current_user

router = APIRouter(prefix="/relationships", tags=["relationships"])
logger = logging.getLogger("breso.relationships")

VALID_RELATIONSHIP_TYPES = {"family", "professional"}


class InviteBody(BaseModel):
    email: str
    relationship_type: str  # "family" | "professional"


# ---------------------------------------------------------------------------
# POST /relationships/invite
# ---------------------------------------------------------------------------


@router.post("/invite", status_code=201)
async def invite_related_user(
    body: InviteBody,
    current_user=Depends(get_current_user),
) -> dict:
    """
    Patient invites a family member or professional by email.
    Creates a pending relationship record. The invited user must accept.
    """
    if body.relationship_type not in VALID_RELATIONSHIP_TYPES:
        raise HTTPException(
            status_code=422,
            detail=f"relationship_type must be one of: {sorted(VALID_RELATIONSHIP_TYPES)}",
        )

    supabase = get_supabase()

    # Verify caller is a patient
    user_resp = (
        supabase.table("users")
        .select("user_type")
        .eq("id", current_user.id)
        .single()
        .execute()
    )
    if (user_resp.data or {}).get("user_type") != "patient":
        raise HTTPException(status_code=403, detail="Only patients can send invitations")

    # Look up the invited user by email
    try:
        invited_resp = (
            supabase.auth.admin.list_users()
        )
        # Find the user with matching email in auth users
        invited_auth_user = next(
            (u for u in (invited_resp or []) if getattr(u, "email", None) == body.email),
            None,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "relationships.invite.lookup_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to look up user") from exc

    if not invited_auth_user:
        raise HTTPException(status_code=404, detail="No user found with that email")

    invited_id = invited_auth_user.id
    if invited_id == current_user.id:
        raise HTTPException(status_code=422, detail="Cannot invite yourself")

    # Check for existing relationship
    existing = (
        supabase.table("user_relationships")
        .select("id, status")
        .eq("patient_id", current_user.id)
        .eq("related_user_id", invited_id)
        .execute()
    )
    if existing.data:
        row = existing.data[0]
        raise HTTPException(
            status_code=409,
            detail=f"Relationship already exists with status: {row['status']}",
        )

    # Create the relationship
    try:
        insert_resp = (
            supabase.table("user_relationships")
            .insert(
                {
                    "patient_id": current_user.id,
                    "related_user_id": invited_id,
                    "relationship_type": body.relationship_type,
                    "status": "pending",
                }
            )
            .execute()
        )
        relationship = insert_resp.data[0]
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "relationships.invite.insert_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to create relationship") from exc

    logger.info(
        {
            "event": "relationships.invite.sent",
            "patient_id": current_user.id,
            "related_user_id": invited_id,
            "relationship_type": body.relationship_type,
        }
    )
    return {"relationship_id": relationship["id"], "status": "pending"}


# ---------------------------------------------------------------------------
# GET /relationships/my-patients  (for family / professional users)
# ---------------------------------------------------------------------------


@router.get("/my-patients")
async def get_my_patients(current_user=Depends(get_current_user)) -> list[dict]:
    """
    Return the list of patients linked to the current family/professional user.
    Only includes active relationships.
    Chat content is never exposed — only metadata and alert summaries.
    """
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("user_relationships")
            .select(
                "id, patient_id, relationship_type, status, created_at, "
                "users!patient_id(display_name, language, user_type)"
            )
            .eq("related_user_id", current_user.id)
            .eq("status", "active")
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "relationships.my_patients.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch patients") from exc

    return [
        {
            "relationship_id": r["id"],
            "patient_id": r["patient_id"],
            "relationship_type": r["relationship_type"],
            "patient_name": (r.get("users") or {}).get("display_name"),
            "patient_language": (r.get("users") or {}).get("language", "es"),
            "since": r["created_at"],
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# GET /relationships/my-support-network  (for patient users)
# ---------------------------------------------------------------------------


@router.get("/my-support-network")
async def get_my_support_network(current_user=Depends(get_current_user)) -> list[dict]:
    """Return all family/professional contacts linked to the current patient."""
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("user_relationships")
            .select(
                "id, related_user_id, relationship_type, status, created_at, "
                "users!related_user_id(display_name, user_type)"
            )
            .eq("patient_id", current_user.id)
            .execute()
        )
        rows = resp.data or []
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "relationships.support_network.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to fetch support network") from exc

    return [
        {
            "relationship_id": r["id"],
            "related_user_id": r["related_user_id"],
            "relationship_type": r["relationship_type"],
            "status": r["status"],
            "name": (r.get("users") or {}).get("display_name"),
            "user_type": (r.get("users") or {}).get("user_type"),
            "since": r["created_at"],
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# PATCH /relationships/{id}/accept
# ---------------------------------------------------------------------------


@router.patch("/{relationship_id}/accept")
async def accept_relationship(
    relationship_id: str,
    current_user=Depends(get_current_user),
) -> dict:
    """Accept a pending relationship invitation (called by the related user)."""
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("user_relationships")
            .update({"status": "active"})
            .eq("id", relationship_id)
            .eq("related_user_id", current_user.id)
            .eq("status", "pending")
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Relationship not found or already processed")
        return {"relationship_id": relationship_id, "status": "active"}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "relationships.accept.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to accept relationship") from exc


# ---------------------------------------------------------------------------
# PATCH /relationships/{id}/reject
# ---------------------------------------------------------------------------


@router.patch("/{relationship_id}/reject")
async def reject_relationship(
    relationship_id: str,
    current_user=Depends(get_current_user),
) -> dict:
    """Reject a pending relationship invitation."""
    supabase = get_supabase()
    try:
        resp = (
            supabase.table("user_relationships")
            .update({"status": "rejected"})
            .eq("id", relationship_id)
            .eq("related_user_id", current_user.id)
            .eq("status", "pending")
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Relationship not found or already processed")
        return {"relationship_id": relationship_id, "status": "rejected"}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "relationships.reject.error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to reject relationship") from exc
