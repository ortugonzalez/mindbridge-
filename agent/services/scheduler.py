"""Daily check-in scheduler — APScheduler with missed check-in notifications."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from integrations.email_client import send_alert_email
from integrations.supabase_client import get_supabase

logger = logging.getLogger("breso.scheduler")
scheduler = BackgroundScheduler()


def check_missed_checkins() -> None:
    """
    Runs every hour.
    Finds users who haven't had a check-in response in 24+ hours
    and notifies their trusted contacts via email.
    """
    try:
        supabase = get_supabase()
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

        # Get all active trusted contacts
        contacts_res = (
            supabase.table("trusted_contacts")
            .select("user_id, contact_email, relationship_label")
            .eq("active", True)
            .execute()
        )
        if not contacts_res.data:
            return

        # Group contacts by user_id to avoid duplicate queries
        contacts_by_user: dict[str, list[dict]] = {}
        for c in contacts_res.data:
            contacts_by_user.setdefault(c["user_id"], []).append(c)

        for user_id, user_contacts in contacts_by_user.items():
            try:
                # Check if user responded to a check-in in the last 24h
                recent = (
                    supabase.table("checkins")
                    .select("id")
                    .eq("user_id", user_id)
                    .gte("responded_at", cutoff)
                    .limit(1)
                    .execute()
                )
                if recent.data:
                    continue  # User checked in recently — nothing to do

                # Get patient display name
                patient_name = "tu ser querido"
                try:
                    user_res = supabase.auth.admin.get_user_by_id(user_id)
                    meta = user_res.user.user_metadata or {}
                    patient_name = (
                        meta.get("display_name")
                        or meta.get("name")
                        or patient_name
                    )
                except Exception:  # noqa: BLE001
                    pass

                message = (
                    f"Solo quería avisarte que {patient_name} no tuvo "
                    f"su conversación diaria con Soledad hoy.\n\n"
                    f"No es una alarma — a veces simplemente se olvidan "
                    f"o tuvieron un día ocupado.\n\n"
                    f"Pero si tenés un momento, puede ser lindo escribirle o llamarle.\n\n"
                    f"— Soledad, por BRESO"
                )

                for contact in user_contacts:
                    relation = (contact.get("relationship_label") or "").capitalize()
                    send_alert_email(
                        to_email=contact["contact_email"],
                        to_name=relation or "Hola",
                        patient_name=patient_name,
                        alert_level="yellow",
                        message=message,
                    )
                    logger.info({
                        "event": "scheduler.missed_checkin_notified",
                        "user_id": user_id,
                        "contact_email": contact["contact_email"],
                    })

            except Exception as exc:  # noqa: BLE001
                logger.error({
                    "event": "scheduler.missed_checkin_error",
                    "user_id": user_id,
                    "error": str(exc),
                })

    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "scheduler.check_missed_checkins_failed", "error": str(exc)})


def start() -> None:
    """Start the scheduler. Called from main.py lifespan."""
    scheduler.add_job(
        check_missed_checkins,
        "interval",
        hours=1,
        id="missed_checkins",
        replace_existing=True,
    )
    scheduler.start()
    logger.info({"event": "scheduler.started"})


def stop() -> None:
    """Stop the scheduler gracefully."""
    scheduler.shutdown()
    logger.info({"event": "scheduler.stopped"})
