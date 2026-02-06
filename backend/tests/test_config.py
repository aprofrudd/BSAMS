"""Tests for core configuration."""

import os
from unittest.mock import patch

import pytest

from app.core.config import Settings, get_settings


class TestSettings:
    """Test Settings class."""

    def test_default_values(self):
        """Settings should have sensible defaults."""
        env = {k: v for k, v in os.environ.items()}
        with patch.dict(os.environ, env, clear=True):
            settings = Settings()
            assert settings.supabase_url == ""
            assert settings.supabase_key == ""
            assert settings.api_v1_prefix == "/api/v1"

    def test_loads_from_environment(self):
        """Settings should load from environment variables."""
        with patch.dict(
            os.environ,
            {
                "SUPABASE_URL": "https://test.supabase.co",
                "SUPABASE_KEY": "test-key",
            },
        ):
            settings = Settings()
            assert settings.supabase_url == "https://test.supabase.co"
            assert settings.supabase_key == "test-key"

    def test_case_insensitive(self):
        """Settings should be case insensitive for env vars."""
        with patch.dict(os.environ, {"supabase_url": "https://lower.supabase.co"}):
            settings = Settings()
            assert settings.supabase_url == "https://lower.supabase.co"


class TestGetSettings:
    """Test get_settings function."""

    def test_returns_settings_instance(self):
        """get_settings should return a Settings instance."""
        get_settings.cache_clear()
        settings = get_settings()
        assert isinstance(settings, Settings)

    def test_caching(self):
        """get_settings should return cached instance."""
        get_settings.cache_clear()
        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2
