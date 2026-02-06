"""Shared test configuration."""

from uuid import UUID

import pytest

from app.core.security import AuthenticatedUser, get_current_user
from app.main import app

TEST_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
TEST_ADMIN_ID = UUID("00000000-0000-0000-0000-000000000099")


async def override_get_current_user() -> AuthenticatedUser:
    """Test override that returns a fixed user with coach role."""
    return AuthenticatedUser(id=TEST_USER_ID, role="coach")


async def override_get_current_admin() -> AuthenticatedUser:
    """Test override that returns a fixed user with admin role."""
    return AuthenticatedUser(id=TEST_ADMIN_ID, role="admin")


# Apply dependency override for all tests
app.dependency_overrides[get_current_user] = override_get_current_user


@pytest.fixture
def test_user_id() -> UUID:
    """Return the test user UUID for assertions."""
    return TEST_USER_ID


@pytest.fixture
def test_admin_id() -> UUID:
    """Return the test admin UUID for assertions."""
    return TEST_ADMIN_ID


@pytest.fixture
def admin_client():
    """Provide a test client authenticated as admin."""
    from fastapi.testclient import TestClient

    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = override_get_current_admin
    client = TestClient(app)
    yield client
    if original:
        app.dependency_overrides[get_current_user] = original
    else:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture(autouse=True)
def _reset_rate_limiters():
    """Reset rate limiter storage between tests to prevent cross-test 429s."""
    yield
    from app.routers.uploads import limiter as uploads_limiter
    from app.routers.auth import limiter as auth_limiter

    uploads_limiter.reset()
    auth_limiter.reset()
