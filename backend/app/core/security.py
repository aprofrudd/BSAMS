"""Authentication and security utilities."""

from uuid import UUID

from app.core.config import get_settings


def get_current_user() -> UUID:
    """
    Get the current authenticated user.

    In development mode, returns a hardcoded UUID from settings.
    This bypasses actual authentication for development purposes.

    Returns:
        UUID: The current user's ID.
    """
    settings = get_settings()
    return UUID(settings.dev_user_id)
