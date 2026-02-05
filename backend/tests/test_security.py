"""Tests for security module."""

import os
from unittest.mock import patch
from uuid import UUID

import pytest

from app.core.config import get_settings
from app.core.security import get_current_user


class TestGetCurrentUser:
    """Test get_current_user function."""

    def test_returns_uuid(self):
        """get_current_user should return a UUID instance."""
        get_settings.cache_clear()
        user_id = get_current_user()
        assert isinstance(user_id, UUID)

    def test_returns_default_dev_user_id(self):
        """get_current_user should return the default dev user ID."""
        get_settings.cache_clear()
        user_id = get_current_user()
        assert str(user_id) == "00000000-0000-0000-0000-000000000001"

    def test_returns_configured_dev_user_id(self):
        """get_current_user should return configured dev user ID from env."""
        get_settings.cache_clear()
        custom_uuid = "12345678-1234-1234-1234-123456789012"
        with patch.dict(os.environ, {"DEV_USER_ID": custom_uuid}):
            get_settings.cache_clear()
            user_id = get_current_user()
            assert str(user_id) == custom_uuid

    def test_uuid_is_valid(self):
        """Returned UUID should be valid and convertible."""
        get_settings.cache_clear()
        user_id = get_current_user()
        # Should not raise
        uuid_str = str(user_id)
        assert len(uuid_str) == 36
        assert uuid_str.count("-") == 4
