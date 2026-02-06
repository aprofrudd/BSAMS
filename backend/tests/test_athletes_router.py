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


class TestMergeAthletes:
    """Test POST /api/v1/athletes/merge"""

    def test_merge_athletes_success(self, mock_supabase):
        """Should reassign events and delete the duplicate athlete."""
        keep_id = str(uuid4())
        merge_id = str(uuid4())

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "athletes":
                # Both athlete existence checks return data
                mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                    {"id": keep_id}
                ]
                mock_table.delete.return_value.eq.return_value.eq.return_value.execute.return_value = (
                    None
                )
            elif table_name == "performance_events":
                if call_count["n"] == 0:
                    # First call: count events for merge_id
                    mock_table.select.return_value.eq.return_value.execute.return_value.data = [
                        {"id": str(uuid4())},
                        {"id": str(uuid4())},
                        {"id": str(uuid4())},
                    ]
                    call_count["n"] += 1
                else:
                    # Second call: update events
                    mock_table.update.return_value.eq.return_value.execute.return_value = (
                        None
                    )
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        response = client.post(
            "/api/v1/athletes/merge",
            json={"keep_id": keep_id, "merge_id": merge_id},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["kept_athlete_id"] == keep_id
        assert data["merged_events"] == 3
        assert data["deleted_athlete_id"] == merge_id

    def test_merge_same_athlete_rejected(self, mock_supabase):
        """Should return 400 when keep_id equals merge_id."""
        same_id = str(uuid4())

        response = client.post(
            "/api/v1/athletes/merge",
            json={"keep_id": same_id, "merge_id": same_id},
        )

        assert response.status_code == 400
        assert "must be different" in response.json()["detail"]

    def test_merge_nonexistent_athlete(self, mock_supabase):
        """Should return 404 when an athlete is not found."""
        keep_id = str(uuid4())
        merge_id = str(uuid4())

        # First athlete lookup returns empty (not found)
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        response = client.post(
            "/api/v1/athletes/merge",
            json={"keep_id": keep_id, "merge_id": merge_id},
        )

        assert response.status_code == 404
        assert "Athlete not found" in response.json()["detail"]


class TestDeleteAllData:
    """Test DELETE /api/v1/athletes/"""

    def test_delete_all_data_success(self, mock_supabase):
        """Should delete all athletes and events for the coach."""
        athlete_id_1 = str(uuid4())
        athlete_id_2 = str(uuid4())

        call_count = {"n": 0}

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "athletes":
                if call_count["n"] == 0:
                    # First call: select athlete IDs
                    mock_table.select.return_value.eq.return_value.execute.return_value.data = [
                        {"id": athlete_id_1},
                        {"id": athlete_id_2},
                    ]
                    call_count["n"] += 1
                else:
                    # Later call: delete athletes
                    mock_table.delete.return_value.eq.return_value.execute.return_value = None
            elif table_name == "performance_events":
                # Events for each athlete
                mock_table.select.return_value.eq.return_value.execute.return_value.data = [
                    {"id": str(uuid4())},
                    {"id": str(uuid4())},
                ]
                mock_table.delete.return_value.eq.return_value.execute.return_value = None
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        response = client.delete("/api/v1/athletes/")

        assert response.status_code == 200
        data = response.json()
        assert data["deleted_athletes"] == 2
        assert data["deleted_events"] == 4  # 2 events per athlete

    def test_delete_all_data_empty(self, mock_supabase):
        """Should return zeros when no data exists."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        response = client.delete("/api/v1/athletes/")

        assert response.status_code == 200
        data = response.json()
        assert data["deleted_athletes"] == 0
        assert data["deleted_events"] == 0

    def test_delete_all_data_no_database(self):
        """Should return 503 when database not configured."""
        with patch("app.routers.athletes.get_supabase_client", return_value=None):
            response = client.delete("/api/v1/athletes/")

        assert response.status_code == 503
