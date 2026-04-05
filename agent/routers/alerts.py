"""Alerts router - user notification inbox and read state."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from integrations.supabase_client import get_supabase
from routers.users import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])
logger = logging.getLogger("breso.alerts")


def _safe_iso(raw_value: str | None) -> str:
    if raw_value:
        return raw_value
    return datetime.now(timezone.utc).isoformat()


def _serialize_alert(row: dict) -> dict:
    """Normalize notification and alert rows for the frontend inbox."""
    notification_type = row.get("type") or "alert"
    title = row.get("title") or "Notificación"
    body = row.get("body") or row.get("message") or ""
    created_at = row.get("created_at") or row.get("triggered_at")
    raw_type = notification_type
    if row.get("severity_level"):
        raw_type = f"alert_{row.get('severity_level')}"

    return {
        "id": row.get("id"),
        "type": "system" if notification_type.startswith("system") else "alerts",
        "title": title,
        "body": body,
        "message": body,
        "read": bool(row.get("read", False) or row.get("status") == "resolved"),
        "created_at": _safe_iso(created_at),
        "icon": row.get("icon"),
        "source": row.get("source") or ("alert" if row.get("severity_level") else "user_notification"),
        "source_id": row.get("source_id"),
        "raw_type": raw_type,
        "alert_level": row.get("alert_level") or row.get("severity_level") or notification_type.replace("alert_", ""),
        "status": row.get("status"),
    }


@router.get("")
async def list_alerts(current_user=Depends(get_current_user)) -> list[dict]:
    """Return the current user's notifications ordered from newest to oldest."""
    supabase = get_supabase()
    user_id = str(current_user.id)
    items: list[dict] = []

    try:
        notifications_res = (
            supabase.table("user_notifications")
            .select("id, type, title, body, read, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        for row in notifications_res.data or []:
            items.append(
                {
                    "id": f"notification:{row.get('id')}",
                    "source": "user_notification",
                    "source_id": row.get("id"),
                    "type": "alerts" if str(row.get("type") or "").startswith("alert_") else "system",
                    "raw_type": str(row.get("type") or "system"),
                    "title": row.get("title") or "Notificación",
                    "message": row.get("body") or "",
                    "read": bool(row.get("read")),
                    "created_at": _safe_iso(row.get("created_at")),
                }
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "alerts.notifications_fetch_failed", "error": str(exc)})

    try:
        alerts_res = (
            supabase.table("alerts")
            .select("id, severity_level, status, triggered_at, deviation_summary")
            .eq("user_id", user_id)
            .order("triggered_at", desc=True)
            .execute()
        )
        for row in alerts_res.data or []:
            summary = row.get("deviation_summary") or {}
            message = (
                summary.get("message")
                or summary.get("summary")
                or summary.get("reason")
                or "Soledad detectó una señal de atención en tu seguimiento."
            )
            severity = row.get("severity_level") or "moderate"
            items.append(
                {
                    "id": f"alert:{row.get('id')}",
                    "source": "alert",
                    "source_id": row.get("id"),
                    "type": "alerts",
                    "raw_type": f"alert_{severity}",
                    "title": "Seguimiento de bienestar",
                    "message": message,
                    "read": row.get("status") == "resolved",
                    "created_at": _safe_iso(row.get("triggered_at")),
                    "severity_level": severity,
                    "status": row.get("status") or "pending",
                }
            )
    except Exception as exc:  # noqa: BLE001
        logger.warning({"event": "alerts.rows_fetch_failed", "error": str(exc)})

    items.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    return [_serialize_alert(item) for item in items]


@router.patch("/read-all")
async def mark_all_read(current_user=Depends(get_current_user)) -> dict:
    """Mark all in-app notifications for the current user as read."""
    supabase = get_supabase()
    user_id = str(current_user.id)
    try:
        supabase.table("user_notifications").update({"read": True}).eq("user_id", user_id).eq(
            "read", False
        ).execute()
        return {"ok": True}
    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "alerts.mark_all_read_failed", "error": str(exc)})
        raise HTTPException(status_code=500, detail="Failed to mark notifications as read") from exc


@router.patch("/{notification_id}/read")
async def mark_one_read(notification_id: str, current_user=Depends(get_current_user)) -> dict:
    """Mark a single notification row as read."""
    supabase = get_supabase()
    user_id = str(current_user.id)
    try:
        supabase.table("user_notifications").update({"read": True}).eq("id", notification_id).eq(
            "user_id", user_id
        ).execute()
        return {"ok": True}
    except Exception as exc:  # noqa: BLE001
        logger.error(
            {"event": "alerts.mark_one_read_failed", "error": str(exc), "notification_id": notification_id}
        )
        raise HTTPException(status_code=500, detail="Failed to mark notification as read") from exc
