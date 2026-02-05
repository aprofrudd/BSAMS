"""Tests for core configuration."""

import os
from unittest.mock import patch

import pytest

from app.core.config import Settings, get_settings


class TestSettings:
    """Test Settings class."""

    def test_default_values(self):
        """Settings should have sensible defaults."""
        # Clear DEV_MODE set by conftest to test true defaults
        env = {k: v for k, v in os.environ.items() if k != "DEV_MODE"}
        with patch.dict(os.environ, env, clear=True):
            settings = Settings()
            assert settings.supabase_url == ""
            assert settings.supabase_key == ""
            assert settings.dev_mode is False
            assert settings.dev_user_id == "00000000-0000-0000-0000-000000000001"
            assert settings.api_v1_prefix == "/api/v1"

    def test_loads_from_environment(self):
        """Settings should load from environment variables."""
        with patch.dict(
            os.environ,
            {
                "SUPABASE_URL": "https://test.supabase.co",
                "SUPABASE_KEY": "test-key",
                "DEV_USER_ID": "12345678-1234-1234-1234-123456789012",
            },
        ):
            settings = Settings()
            assert settings.supabase_url == "https://test.supabase.co"
            assert settings.supabase_key == "test-key"
            assert settings.dev_user_id == "12345678-1234-1234-1234-123456789012"

    def test_case_insensitive(self):
        """Settings should be case insensitive for env vars."""
        with patch.dict(os.environ, {"supabase_url": "https://lower.supabase.co"}):
            settings = Settings()
            assert settings.supabase_url == "https://lower.supabase.co"


class TestGetSettings:
    """Test get_settings function."""

    def test_returns_settings_instance(self):
        """get_settings should return a Settings instance."""
        # Clear the cache to get fresh settings
        get_settings.cache_clear()
        settings = get_settings()
        assert isinstance(settings, Settings)

    def test_caching(self):
        """get_settings should return cached instance."""
        get_settings.cache_clear()
        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2
