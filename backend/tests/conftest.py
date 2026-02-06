"""Shared test configuration."""

from uuid import UUID

import pytest

from app.core.security import get_current_user
from app.main import app

TEST_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


async def override_get_current_user() -> UUID:
    """Test override that returns a fixed user ID without JWT validation."""
    return TEST_USER_ID


# Apply dependency override for all tests
app.dependency_overrides[get_current_user] = override_get_current_user


@pytest.fixture
def test_user_id() -> UUID:
    """Return the test user UUID for assertions."""
    return TEST_USER_ID
