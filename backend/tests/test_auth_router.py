"""Tests for auth router."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def mock_supabase():
    """Fixture to mock Supabase client."""
    with patch("app.routers.auth.get_supabase_client") as mock:
        mock_client = MagicMock()
        mock.return_value = mock_client
        yield mock_client


class TestLogin:
    """Test POST /api/v1/auth/login."""

    def test_login_success(self, mock_supabase):
        """Should return user info and set HttpOnly cookie on successful login."""
        mock_session = MagicMock()
        mock_session.access_token = "test-jwt-token"
        mock_user = MagicMock()
        mock_user.id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        mock_user.email = "test@example.com"

        mock_response = MagicMock()
        mock_response.session = mock_session
        mock_response.user = mock_user

        mock_supabase.auth.sign_in_with_password.return_value = mock_response

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "password123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" not in data
        assert data["user_id"] == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
        assert data["email"] == "test@example.com"
        assert "access_token" in response.cookies

    def test_login_invalid_credentials(self, mock_supabase):
        """Should return 401 for invalid credentials."""
        mock_supabase.auth.sign_in_with_password.side_effect = Exception(
            "Invalid login"
        )

        response = client.post(
            "/api/v1/auth/login",
            json={"email": "bad@example.com", "password": "wrong"},
        )

        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid email or password"

    def test_login_missing_email(self):
        """Should return 422 for missing email."""
        response = client.post(
            "/api/v1/auth/login",
            json={"password": "password123"},
        )
        assert response.status_code == 422

    def test_login_invalid_email_format(self):
        """Should return 422 for invalid email format."""
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "not-an-email", "password": "password123"},
        )
        assert response.status_code == 422

    def test_login_no_supabase(self):
        """Should return 503 when Supabase not configured."""
        with patch("app.routers.auth.get_supabase_client", return_value=None):
            response = client.post(
                "/api/v1/auth/login",
                json={"email": "test@example.com", "password": "password123"},
            )
            assert response.status_code == 503


class TestSignup:
    """Test POST /api/v1/auth/signup."""

    def test_signup_success(self, mock_supabase):
        """Should return user info and set HttpOnly cookie on successful signup."""
        mock_session = MagicMock()
        mock_session.access_token = "new-jwt-token"
        mock_user = MagicMock()
        mock_user.id = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff"
        mock_user.email = "new@example.com"

        mock_response = MagicMock()
        mock_response.session = mock_session
        mock_response.user = mock_user

        mock_supabase.auth.sign_up.return_value = mock_response

        response = client.post(
            "/api/v1/auth/signup",
            json={"email": "new@example.com", "password": "password123"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" not in data
        assert data["user_id"] == "bbbbbbbb-cccc-dddd-eeee-ffffffffffff"
        assert data["email"] == "new@example.com"
        assert "access_token" in response.cookies

    def test_signup_no_session(self, mock_supabase):
        """Should return 400 when signup requires email confirmation."""
        mock_response = MagicMock()
        mock_response.session = None

        mock_supabase.auth.sign_up.return_value = mock_response

        response = client.post(
            "/api/v1/auth/signup",
            json={"email": "new@example.com", "password": "password123"},
        )

        assert response.status_code == 400

    def test_signup_error(self, mock_supabase):
        """Should return 400 on signup failure."""
        mock_supabase.auth.sign_up.side_effect = Exception("User already exists")

        response = client.post(
            "/api/v1/auth/signup",
            json={"email": "existing@example.com", "password": "password123"},
        )

        assert response.status_code == 400


class TestMe:
    """Test GET /api/v1/auth/me."""

    def test_me_returns_user_id(self):
        """Should return current user ID (dev mode)."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "00000000-0000-0000-0000-000000000001"


class TestLogout:
    """Test POST /api/v1/auth/logout."""

    def test_logout_success(self, mock_supabase):
        """Should return 204 on successful logout."""
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 204
