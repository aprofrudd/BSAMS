"""Tests for athletes router."""

from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def mock_supabase():
    """Fixture to mock Supabase client."""
    with patch("app.routers.athletes.get_supabase_client") as mock:
        mock_client = MagicMock()
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def sample_athlete_data():
    """Sample athlete data for tests."""
    return {
        "id": str(uuid4()),
        "coach_id": "00000000-0000-0000-0000-000000000001",
        "name": "Test Athlete",
        "gender": "male",
        "date_of_birth": "1995-05-15",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }


class TestListAthletes:
    """Test GET /api/v1/athletes/"""

    def test_list_athletes_success(self, mock_supabase, sample_athlete_data):
        """Should return list of athletes."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.range.return_value.execute.return_value.data = [
            sample_athlete_data
        ]

        response = client.get("/api/v1/athletes/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Athlete"

    def test_list_athletes_empty(self, mock_supabase):
        """Should return empty list when no athletes exist."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.range.return_value.execute.return_value.data = (
            []
        )

        response = client.get("/api/v1/athletes/")

        assert response.status_code == 200
        assert response.json() == []

    def test_list_athletes_no_database(self):
        """Should return 503 when database not configured."""
        with patch("app.routers.athletes.get_supabase_client", return_value=None):
            response = client.get("/api/v1/athletes/")

        assert response.status_code == 503
        assert "Database not configured" in response.json()["detail"]


class TestGetAthlete:
    """Test GET /api/v1/athletes/{athlete_id}"""

    def test_get_athlete_success(self, mock_supabase, sample_athlete_data):
        """Should return single athlete."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            sample_athlete_data
        ]

        response = client.get(f"/api/v1/athletes/{sample_athlete_data['id']}")

        assert response.status_code == 200
        assert response.json()["name"] == "Test Athlete"

    def test_get_athlete_not_found(self, mock_supabase):
        """Should return 404 when athlete not found."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        response = client.get(f"/api/v1/athletes/{uuid4()}")

        assert response.status_code == 404
        assert "Athlete not found" in response.json()["detail"]

    def test_get_athlete_invalid_uuid(self):
        """Should return 422 for invalid UUID."""
        response = client.get("/api/v1/athletes/not-a-uuid")

        assert response.status_code == 422


class TestCreateAthlete:
    """Test POST /api/v1/athletes/"""

    def test_create_athlete_success(self, mock_supabase, sample_athlete_data):
        """Should create and return new athlete."""
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            sample_athlete_data
        ]

        response = client.post(
            "/api/v1/athletes/",
            json={
                "name": "Test Athlete",
                "gender": "male",
                "date_of_birth": "1995-05-15",
            },
        )

        assert response.status_code == 201
        assert response.json()["name"] == "Test Athlete"

    def test_create_athlete_minimal(self, mock_supabase, sample_athlete_data):
        """Should create athlete with minimal data."""
        sample_athlete_data["date_of_birth"] = None
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
            sample_athlete_data
        ]

        response = client.post(
            "/api/v1/athletes/",
            json={"name": "Test", "gender": "female"},
        )

        assert response.status_code == 201

    def test_create_athlete_invalid_gender(self):
        """Should return 422 for invalid gender."""
        response = client.post(
            "/api/v1/athletes/",
            json={"name": "Test", "gender": "invalid"},
        )

        assert response.status_code == 422

    def test_create_athlete_missing_name(self):
        """Should return 422 when name is missing."""
        response = client.post(
            "/api/v1/athletes/",
            json={"gender": "male"},
        )

        assert response.status_code == 422


class TestUpdateAthlete:
    """Test PATCH /api/v1/athletes/{athlete_id}"""

    def test_update_athlete_success(self, mock_supabase, sample_athlete_data):
        """Should update and return athlete."""
        # Mock existence check
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"id": sample_athlete_data["id"]}
        ]
        # Mock update
        sample_athlete_data["name"] = "Updated Name"
        mock_supabase.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            sample_athlete_data
        ]

        response = client.patch(
            f"/api/v1/athletes/{sample_athlete_data['id']}",
            json={"name": "Updated Name"},
        )

        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    def test_update_athlete_not_found(self, mock_supabase):
        """Should return 404 when athlete not found."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        response = client.patch(
            f"/api/v1/athletes/{uuid4()}",
            json={"name": "Updated Name"},
        )

        assert response.status_code == 404

    def test_update_athlete_no_fields(self, mock_supabase, sample_athlete_data):
        """Should return 400 when no fields provided."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"id": sample_athlete_data["id"]}
        ]

        response = client.patch(
            f"/api/v1/athletes/{sample_athlete_data['id']}",
            json={},
        )

        assert response.status_code == 400


class TestDeleteAthlete:
    """Test DELETE /api/v1/athletes/{athlete_id}"""

    def test_delete_athlete_success(self, mock_supabase, sample_athlete_data):
        """Should delete athlete and return 204."""
        # Mock existence check
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            {"id": sample_athlete_data["id"]}
        ]
        # Mock delete
        mock_supabase.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = (
            None
        )

        response = client.delete(f"/api/v1/athletes/{sample_athlete_data['id']}")

        assert response.status_code == 204

    def test_delete_athlete_not_found(self, mock_supabase):
        """Should return 404 when athlete not found."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        response = client.delete(f"/api/v1/athletes/{uuid4()}")

        assert response.status_code == 404
