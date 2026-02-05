"""Tests for security module."""

import os
from unittest.mock import patch, MagicMock, AsyncMock
from uuid import UUID

import pytest

from app.core.config import get_settings
from app.core.security import get_current_user


class TestGetCurrentUserDevMode:
    """Test get_current_user in dev mode."""

    @pytest.mark.asyncio
    async def test_returns_uuid_in_dev_mode(self):
        """get_current_user should return a UUID in dev mode."""
        get_settings.cache_clear()
        with patch.dict(os.environ, {"DEV_MODE": "true"}):
            get_settings.cache_clear()
            user_id = await get_current_user(credentials=None)
            assert isinstance(user_id, UUID)

    @pytest.mark.asyncio
    async def test_returns_default_dev_user_id(self):
        """get_current_user should return the default dev user ID."""
        get_settings.cache_clear()
        with patch.dict(os.environ, {"DEV_MODE": "true"}):
            get_settings.cache_clear()
            user_id = await get_current_user(credentials=None)
            assert str(user_id) == "00000000-0000-0000-0000-000000000001"

    @pytest.mark.asyncio
    async def test_returns_configured_dev_user_id(self):
        """get_current_user should return configured dev user ID from env."""
        custom_uuid = "12345678-1234-1234-1234-123456789012"
        with patch.dict(os.environ, {"DEV_MODE": "true", "DEV_USER_ID": custom_uuid}):
            get_settings.cache_clear()
            user_id = await get_current_user(credentials=None)
            assert str(user_id) == custom_uuid

    @pytest.mark.asyncio
    async def test_dev_mode_ignores_credentials(self):
        """In dev mode, credentials parameter is ignored."""
        mock_creds = MagicMock()
        mock_creds.credentials = "some-token"
        with patch.dict(os.environ, {"DEV_MODE": "true"}):
            get_settings.cache_clear()
            user_id = await get_current_user(credentials=mock_creds)
            assert str(user_id) == "00000000-0000-0000-0000-000000000001"


class TestGetCurrentUserProdMode:
    """Test get_current_user without dev mode (JWT validation)."""

    @pytest.mark.asyncio
    async def test_missing_credentials_raises_401(self):
        """Should raise 401 when no credentials provided."""
        from fastapi import HTTPException

        with patch.dict(os.environ, {"DEV_MODE": "false"}):
            get_settings.cache_clear()
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(credentials=None)
            assert exc_info.value.status_code == 401
            assert exc_info.value.detail == "Not authenticated"

    @pytest.mark.asyncio
    async def test_valid_token_returns_uuid(self):
        """Should return user UUID for a valid token."""
        mock_creds = MagicMock()
        mock_creds.credentials = "valid-token"

        mock_user = MagicMock()
        mock_user.id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

        mock_response = MagicMock()
        mock_response.user = mock_user

        mock_client = MagicMock()
        mock_client.auth.get_user.return_value = mock_response

        with patch.dict(os.environ, {"DEV_MODE": "false"}):
            get_settings.cache_clear()
            with patch("app.core.security.get_supabase_client", return_value=mock_client):
                user_id = await get_current_user(credentials=mock_creds)
                assert str(user_id) == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
                mock_client.auth.get_user.assert_called_once_with("valid-token")

    @pytest.mark.asyncio
    async def test_invalid_token_raises_401(self):
        """Should raise 401 for an invalid token."""
        from fastapi import HTTPException

        mock_creds = MagicMock()
        mock_creds.credentials = "bad-token"

        mock_client = MagicMock()
        mock_client.auth.get_user.side_effect = Exception("Invalid JWT")

        with patch.dict(os.environ, {"DEV_MODE": "false"}):
            get_settings.cache_clear()
            with patch("app.core.security.get_supabase_client", return_value=mock_client):
                with pytest.raises(HTTPException) as exc_info:
                    await get_current_user(credentials=mock_creds)
                assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_no_supabase_client_raises_503(self):
        """Should raise 503 when Supabase client not configured."""
        from fastapi import HTTPException

        mock_creds = MagicMock()
        mock_creds.credentials = "some-token"

        with patch.dict(os.environ, {"DEV_MODE": "false"}):
            get_settings.cache_clear()
            with patch("app.core.security.get_supabase_client", return_value=None):
                with pytest.raises(HTTPException) as exc_info:
                    await get_current_user(credentials=mock_creds)
                assert exc_info.value.status_code == 503

    @pytest.mark.asyncio
    async def test_null_user_raises_401(self):
        """Should raise 401 when Supabase returns null user."""
        from fastapi import HTTPException

        mock_creds = MagicMock()
        mock_creds.credentials = "some-token"

        mock_response = MagicMock()
        mock_response.user = None

        mock_client = MagicMock()
        mock_client.auth.get_user.return_value = mock_response

        with patch.dict(os.environ, {"DEV_MODE": "false"}):
            get_settings.cache_clear()
            with patch("app.core.security.get_supabase_client", return_value=mock_client):
                with pytest.raises(HTTPException) as exc_info:
                    await get_current_user(credentials=mock_creds)
                assert exc_info.value.status_code == 401
