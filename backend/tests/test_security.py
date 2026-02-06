"""Tests for security module."""

from unittest.mock import MagicMock, patch
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.core.security import AuthenticatedUser, get_current_user


def _make_request(cookies=None):
    """Create a mock Request object."""
    mock_request = MagicMock()
    mock_request.cookies = cookies or {}
    return mock_request


class TestGetCurrentUserBearerToken:
    """Test get_current_user with Authorization header."""

    @pytest.mark.asyncio
    async def test_missing_credentials_raises_401(self):
        """Should raise 401 when no credentials provided."""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request=_make_request(), credentials=None)
        assert exc_info.value.status_code == 401
        assert exc_info.value.detail == "Not authenticated"

    @pytest.mark.asyncio
    async def test_valid_token_returns_authenticated_user(self):
        """Should return AuthenticatedUser for a valid token."""
        mock_creds = MagicMock()
        mock_creds.credentials = "valid-token"

        mock_user = MagicMock()
        mock_user.id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

        mock_response = MagicMock()
        mock_response.user = mock_user

        mock_profile_result = MagicMock()
        mock_profile_result.data = [{"role": "coach"}]

        mock_client = MagicMock()
        mock_client.auth.get_user.return_value = mock_response
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_profile_result

        with patch("app.core.security.get_supabase_client", return_value=mock_client):
            result = await get_current_user(request=_make_request(), credentials=mock_creds)
            assert isinstance(result, AuthenticatedUser)
            assert str(result.id) == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
            assert result.role == "coach"
            mock_client.auth.get_user.assert_called_once_with("valid-token")

    @pytest.mark.asyncio
    async def test_invalid_token_raises_401(self):
        """Should raise 401 for an invalid token."""
        mock_creds = MagicMock()
        mock_creds.credentials = "bad-token"

        mock_client = MagicMock()
        mock_client.auth.get_user.side_effect = Exception("Invalid JWT")

        with patch("app.core.security.get_supabase_client", return_value=mock_client):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(request=_make_request(), credentials=mock_creds)
            assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_no_supabase_client_raises_503(self):
        """Should raise 503 when Supabase client not configured."""
        mock_creds = MagicMock()
        mock_creds.credentials = "some-token"

        with patch("app.core.security.get_supabase_client", return_value=None):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(request=_make_request(), credentials=mock_creds)
            assert exc_info.value.status_code == 503

    @pytest.mark.asyncio
    async def test_null_user_raises_401(self):
        """Should raise 401 when Supabase returns null user."""
        mock_creds = MagicMock()
        mock_creds.credentials = "some-token"

        mock_response = MagicMock()
        mock_response.user = None

        mock_client = MagicMock()
        mock_client.auth.get_user.return_value = mock_response

        with patch("app.core.security.get_supabase_client", return_value=mock_client):
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(request=_make_request(), credentials=mock_creds)
            assert exc_info.value.status_code == 401


class TestGetCurrentUserCookie:
    """Test get_current_user with HttpOnly cookie."""

    @pytest.mark.asyncio
    async def test_reads_token_from_cookie(self):
        """Should read JWT from access_token cookie."""
        mock_user = MagicMock()
        mock_user.id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

        mock_response = MagicMock()
        mock_response.user = mock_user

        mock_profile_result = MagicMock()
        mock_profile_result.data = [{"role": "admin"}]

        mock_client = MagicMock()
        mock_client.auth.get_user.return_value = mock_response
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_profile_result

        request = _make_request(cookies={"access_token": "cookie-token"})

        with patch("app.core.security.get_supabase_client", return_value=mock_client):
            result = await get_current_user(request=request, credentials=None)
            assert isinstance(result, AuthenticatedUser)
            assert str(result.id) == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
            assert result.role == "admin"
            mock_client.auth.get_user.assert_called_once_with("cookie-token")

    @pytest.mark.asyncio
    async def test_cookie_takes_priority_over_header(self):
        """Cookie should be used even when header is present."""
        mock_creds = MagicMock()
        mock_creds.credentials = "header-token"

        mock_user = MagicMock()
        mock_user.id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

        mock_response = MagicMock()
        mock_response.user = mock_user

        mock_client = MagicMock()
        mock_client.auth.get_user.return_value = mock_response

        request = _make_request(cookies={"access_token": "cookie-token"})

        with patch("app.core.security.get_supabase_client", return_value=mock_client):
            await get_current_user(request=request, credentials=mock_creds)
            mock_client.auth.get_user.assert_called_once_with("cookie-token")

    @pytest.mark.asyncio
    async def test_falls_back_to_header_when_no_cookie(self):
        """Should use Authorization header when no cookie present."""
        mock_creds = MagicMock()
        mock_creds.credentials = "header-token"

        mock_user = MagicMock()
        mock_user.id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

        mock_response = MagicMock()
        mock_response.user = mock_user

        mock_client = MagicMock()
        mock_client.auth.get_user.return_value = mock_response

        with patch("app.core.security.get_supabase_client", return_value=mock_client):
            await get_current_user(request=_make_request(), credentials=mock_creds)
            mock_client.auth.get_user.assert_called_once_with("header-token")
