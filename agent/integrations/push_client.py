"""Web Push notification client using VAPID keys."""
from __future__ import annotations

import json
import logging
import os

logger = logging.getLogger("breso.push")

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_EMAIL = os.getenv("VAPID_EMAIL", "mailto:hola@breso.app")


def send_push_notification(
    subscription_info: dict,
    title: str,
    body: str,
    url: str = "/chat",
) -> bool:
    """
    Send a Web Push notification to a browser subscription.
    Returns True on success, False on failure or if VAPID keys are not configured.
    subscription_info: the PushSubscription JSON object from the browser.
    """
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning({"event": "push.vapid_keys_missing"})
        return False

    try:
        from pywebpush import webpush, WebPushException  # type: ignore[import]

        data = json.dumps({
            "title": title,
            "body": body,
            "url": url,
            "icon": "/icon-192.svg",
        })

        webpush(
            subscription_info=subscription_info,
            data=data,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_EMAIL},
        )
        logger.info({"event": "push.sent", "title": title})
        return True

    except Exception as exc:  # noqa: BLE001
        logger.error({"event": "push.failed", "error": str(exc)})
        return False
