import logging
import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

logger = logging.getLogger("breso.supabase_client")

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        supabase_url = os.getenv("SUPABASE_URL", "")
        if not supabase_url:
            logger.error({"event": "supabase.init_error", "error": "SUPABASE_URL environment variable is not set"})
            raise ValueError("SUPABASE_URL environment variable is not set")

        supabase_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not supabase_key:
            logger.error({"event": "supabase.init_error", "error": "SUPABASE_SERVICE_KEY environment variable is not set"})
            raise ValueError("SUPABASE_SERVICE_KEY environment variable is not set")

        if not supabase_url.startswith("https://"):
            logger.error({"event": "supabase.init_error", "error": f"SUPABASE_URL has invalid format: {supabase_url!r}"})
            raise ValueError(f"SUPABASE_URL must start with https:// — got: {supabase_url!r}")

        try:
            _client = create_client(supabase_url, supabase_key)
        except Exception as exc:
            logger.error({"event": "supabase.create_client_error", "error": str(exc), "url": supabase_url})
            raise ValueError(f"Failed to create Supabase client: {exc}") from exc

    return _client
