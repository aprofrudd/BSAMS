"""Supabase client singleton."""

from functools import lru_cache
from typing import Optional

from supabase import Client, create_client

from app.core.config import get_settings


@lru_cache
def get_supabase_client() -> Optional[Client]:
    """
    Get a cached Supabase client instance.

    Returns:
        Client or None if Supabase is not configured.
    """
    settings = get_settings()

    if not settings.supabase_url or not settings.supabase_key:
        return None

    return create_client(settings.supabase_url, settings.supabase_key)
