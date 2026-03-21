"""Daily check-in scheduler — APScheduler with missed check-in notifications."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from integrations.email_client import send_alert_email, send_checkin_reminder
from integrations.supabase_client import get_supabase

logger = logging.getLogger("breso.scheduler")
scheduler = BackgroundScheduler()


def check_missed_checkins() -> None:
    """
    Runs every hour.
    Finds patients who haven't had a check-in response in 24+ hours
    and notifies their trusted contacts via email.
    """
    try:
        supabase = get_supabase()

        # Get all patients
        users_res = (
            supabase.table("users")
            .select("id, display_name, email, plan")
            .eq("user_type", "patient")
            .execute()
        )
        if not users_res.data:
            return

        for user in users_res.data:
            try:
                # Check last check-in
                last = (
                    supabase.table("check_ins")
                    .select("created_at")
                    .eq("user_id", user["id"])
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
                )

                if not last.data:
                    continue

                last_time = datetime.fromisoformat(
                    last.data[0]["created_at"].replace("Z", "+00:00")
                )
                hours_since = (
                    datetime.now(timezone.utc) - last_time
                ).total_seconds() / 3600

                if hours_since < 24:
                    continue

                # Get trusted contacts from user_relationships
                contacts_res = (
                    supabase.table("user_relationships")
                    .select("*")
                    .eq("patient_id", user["id"])
                    .eq("status", "active")
                    .execute()
                )
                if not contacts_res.data:
                    continue

                patient_name = user.get("display_name") or "tu ser querido"
                message = (
                    f"{patient_name} no tuvo su conversación diaria con Soledad hoy. "
                    f"No es una alarma — a veces simplemente se olvidan o tuvieron un día ocupado. "
                    f"Pero si tenés un momento, puede ser lindo escribirle."
                )

                for contact in contacts_res.data:
                    try:
                        contact_info = (
                            supabase.table("users")
                            .select("display_name, email")
                            .eq("id", contact["related_user_id"])
                            .execute()
                        )
                        if not contact_info.data:
                            continue
                        c = contact_info.data[0]
                        if not c.get("email"):
                            continue
                        send_alert_email(
                            to_email=c["email"],
                            to_name=c.get("display_name") or "Contacto",
                            patient_name=patient_name,
                            alert_level="yellow",
                            message=message,
                        )
                        logger.info({
                            "event": "scheduler.missed_checkin_notified",
                            "user_id": user["id"],
                            "contact_email": c["email"],
                        })
                    except Exception as exc:  # noqa: BLE001
                        logger.error({
                            "event": "scheduler.contact_notify_error",
                            "user_id": user["id"],
                            "error": str(exc),
                        })

            except Exception as exc:  # noqa: BLE001
                logger.error({
                    "event": "scheduler.missed_checkin_error",
                    "user_id": user["id"],
                    "error": str(exc),
                })

    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "scheduler.check_missed_checkins_failed", "error": str(exc)})


def send_proactive_checkin() -> None:
    """
    Runs daily at 23:00 UTC (20:00 Argentina time).
    Sends a check-in reminder to patients who haven't chatted today.
    """
    try:
        supabase = get_supabase()
        today = datetime.now(timezone.utc).date().isoformat()

        users_res = (
            supabase.table("users")
            .select("id, display_name, email")
            .eq("user_type", "patient")
            .execute()
        )
        if not users_res.data:
            return

        for user in users_res.data:
            try:
                if not user.get("email"):
                    continue
                # Check if user has had any check-in today
                last = (
                    supabase.table("check_ins")
                    .select("id")
                    .eq("user_id", user["id"])
                    .gte("created_at", today)
                    .limit(1)
                    .execute()
                )
                if last.data:
                    continue  # Already checked in today

                send_checkin_reminder(
                    to_email=user["email"],
                    user_name=user.get("display_name") or "amigo/a",
                )
            except Exception as exc:  # noqa: BLE001
                logger.error({
                    "event": "scheduler.proactive_checkin_user_error",
                    "user_id": user["id"],
                    "error": str(exc),
                })
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "scheduler.proactive_checkin_failed", "error": str(exc)})


def start() -> None:
    """Start the scheduler. Called from main.py lifespan."""
    scheduler.add_job(
        check_missed_checkins,
        "interval",
        hours=1,
        id="missed_checkins",
        replace_existing=True,
    )
    scheduler.add_job(
        send_proactive_checkin,
        "cron",
        hour=23,
        minute=0,
        id="proactive_checkin",
        replace_existing=True,
    )
    scheduler.start()
    logger.info({"event": "scheduler.started"})


def stop() -> None:
    """Stop the scheduler gracefully."""
    scheduler.shutdown()
    logger.info({"event": "scheduler.stopped"})
