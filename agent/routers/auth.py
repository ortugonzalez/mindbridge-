"""Authentication routes — register, sign-in, magic-link, sign-out."""
from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from agent.integrations.supabase_client import get_supabase
from agent.models.types import UserCreate

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("breso.auth")


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
