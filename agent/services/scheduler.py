"""Daily check-in scheduler — basic APScheduler setup.
Full per-user scheduling in Phase 4 polish."""
import logging

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger("breso.scheduler")
scheduler = BackgroundScheduler()


def start() -> None:
    """Start the scheduler. Called from main.py lifespan."""
    scheduler.start()
    logger.info({"event": "scheduler.started"})


def stop() -> None:
    """Stop the scheduler gracefully."""
    scheduler.shutdown()
    logger.info({"event": "scheduler.stopped"})
