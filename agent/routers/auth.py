"""Authentication routes — register, sign-in, magic-link, sign-out."""
from __future__ import annotations

import logging
import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from agent.integrations.email_client import send_welcome_email
from agent.integrations.supabase_client import get_supabase
from agent.models.types import UserCreate
from agent.routers.users import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("breso.auth")


class RegisterWithTypeBody(BaseModel):
    email: str
    user_type: str  # "patient" | "family"
    display_name: str
    phone_number: Optional[str] = None


@router.post("/register", status_code=201)
async def register(body: UserCreate) -> dict:
    """Create a new Supabase Auth user and insert a matching row in the users table."""
    supabase = get_supabase()
    try:
        auth_response = supabase.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "auth.register.error", "error": str(exc)})
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    auth_user = getattr(auth_response, "user", None)
    if not auth_user:
        raise HTTPException(status_code=400, detail="Registration failed — no user returned")

    try:
        row: dict = {
            "id": auth_user.id,
            "language": body.language.value,
            "timezone": body.timezone,
            "checkin_time_preference": body.checkin_time_preference,
            "baseline_ready": False,
            "plan": "free_trial",
        }
        if body.phone_number:
            row["phone_number"] = body.phone_number
        if body.display_name:
            row["display_name"] = body.display_name
        supabase.table("users").insert(row).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "auth.register.db_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to create user profile") from exc

    logger.info({"event": "auth.register.success", "user_id": auth_user.id})

    # Send welcome email (non-blocking — failure doesn't affect registration)
    name = body.display_name or body.email.split("@")[0]
    try:
        send_welcome_email(to_email=body.email, user_name=name)
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "auth.register.welcome_email_failed", "error": str(exc)})

    return {
        "user_id": auth_user.id,
        "message": "Check your email to confirm your account",
    }


@router.post("/signin")
async def signin(body: dict) -> dict:
    """Sign in with email and password. Returns access token."""
    email = body.get("email")
    password = body.get("password")
    if not email or not password:
        raise HTTPException(status_code=422, detail="email and password are required")

    supabase = get_supabase()
    try:
        auth_response = supabase.auth.sign_in_with_password(
            {"email": email, "password": password}
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "auth.signin.error", "error": str(exc)})
        raise HTTPException(status_code=401, detail="Invalid credentials") from exc

    session = getattr(auth_response, "session", None)
    user = getattr(auth_response, "user", None)
    if not session or not user:
        raise HTTPException(status_code=401, detail="Sign-in failed")

    logger.info({"event": "auth.signin.success", "user_id": user.id})
    return {
        "access_token": session.access_token,
        "user_id": user.id,
    }


@router.post("/magic-link")
async def magic_link(body: dict) -> dict:
    """Send a magic-link (OTP) email for passwordless sign-in."""
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=422, detail="email is required")

    supabase = get_supabase()
    try:
        supabase.auth.sign_in_with_otp({"email": email})
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "auth.magic_link.error", "error": str(exc)})
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    logger.info({"event": "auth.magic_link.sent", "email": email})
    return {"message": "Magic link sent to your email. It expires in 15 minutes."}


@router.post("/signout")
async def signout() -> dict:
    """Sign out the current session."""
    supabase = get_supabase()
    try:
        supabase.auth.sign_out()
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "auth.signout.error", "error": str(exc)})

    return {"message": "Signed out"}


# ---------------------------------------------------------------------------
# POST /auth/register-with-type
# ---------------------------------------------------------------------------


@router.post("/register-with-type", status_code=201)
async def register_with_type(body: RegisterWithTypeBody) -> dict:
    """
    Register a patient or family user by type.
    Family users also get a pending invite relationship record created.
    """
    if body.user_type not in ("patient", "family"):
        raise HTTPException(status_code=422, detail="user_type must be 'patient' or 'family'")

    supabase = get_supabase()

    # Generate a secure random password — user authenticates via magic link
    temp_password = secrets.token_urlsafe(24)

    try:
        auth_response = supabase.auth.sign_up(
            {"email": body.email, "password": temp_password}
        )
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "auth.register_with_type.error", "error": str(exc)})
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    auth_user = getattr(auth_response, "user", None)
    if not auth_user:
        raise HTTPException(status_code=400, detail="Registration failed — no user returned")

    try:
        row: dict = {
            "id": auth_user.id,
            "language": "es",
            "timezone": "America/Argentina/Buenos_Aires",
            "checkin_time_preference": "09:00",
            "baseline_ready": False,
            "plan": "free_trial",
            "user_type": body.user_type,
            "display_name": body.display_name,
        }
        if body.phone_number:
            row["phone_number"] = body.phone_number
        supabase.table("users").insert(row).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "auth.register_with_type.db_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to create user profile") from exc

    invite_token: str | None = None

    if body.user_type == "family":
        invite_token = str(uuid.uuid4())
        try:
            supabase.table("user_relationships").insert(
                {
                    "related_user_id": auth_user.id,
                    "relationship_type": "family",
                    "status": "pending_patient",
                    "invite_token": invite_token,
                }
            ).execute()
        except Exception as exc:  # noqa: BLE001
            logger.error({"event": "auth.register_with_type.invite_error", "error": str(exc)})
            # Non-fatal — user is created; invite can be regenerated

    logger.info(
        {
            "event": "auth.register_with_type.success",
            "user_id": auth_user.id,
            "user_type": body.user_type,
        }
    )

    name = body.display_name or body.email.split("@")[0]
    try:
        send_welcome_email(to_email=body.email, user_name=name)
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "auth.register_with_type.welcome_email_failed", "error": str(exc)})

    response: dict = {
        "user_id": auth_user.id,
        "user_type": body.user_type,
        "message": "Check your email to confirm your account",
    }
    if invite_token:
        response["invite_token"] = invite_token

    return response


# ---------------------------------------------------------------------------
# GET /auth/accept-invite/{token}
# ---------------------------------------------------------------------------


@router.get("/accept-invite/{token}")
async def accept_invite(token: str, current_user=Depends(get_current_user)) -> dict:
    """
    Accept a family invite.
    Links the currently logged-in patient to the family user.
    Updates the relationship status to 'active'.
    """
    supabase = get_supabase()

    try:
        resp = (
            supabase.table("user_relationships")
            .select("id, related_user_id, status")
            .eq("invite_token", token)
            .eq("status", "pending_patient")
            .single()
            .execute()
        )
        relationship = resp.data
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "auth.accept_invite.lookup_error", "error": str(exc)})
        raise HTTPException(status_code=404, detail="Invite not found or already used") from exc

    if not relationship:
        raise HTTPException(status_code=404, detail="Invite not found or already used")

    try:
        supabase.table("user_relationships").update(
            {
                "patient_id": current_user.id,
                "status": "active",
            }
        ).eq("id", relationship["id"]).execute()
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "auth.accept_invite.update_error", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to accept invite") from exc

    # Fetch family user's display name
    family_name: str | None = None
    try:
        user_resp = (
            supabase.table("users")
            .select("display_name")
            .eq("id", relationship["related_user_id"])
            .single()
            .execute()
        )
        family_name = (user_resp.data or {}).get("display_name")
    except Exception:  # noqa: BLE001
        pass

    logger.info(
        {
            "event": "auth.accept_invite.success",
            "patient_id": current_user.id,
            "family_user_id": relationship["related_user_id"],
        }
    )

    return {
        "success": True,
        "family_user_name": family_name,
        "message": "Invitación aceptada exitosamente",
    }
