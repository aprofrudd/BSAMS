"""Tests for analysis router."""

from datetime import datetime
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def mock_supabase():
    """Fixture to mock Supabase client."""
    with patch("app.routers.analysis.get_supabase_client") as mock:
        mock_client = MagicMock()
        mock.return_value = mock_client
        yield mock_client


@pytest.fixture
def sample_athletes():
    """Sample athlete data."""
    return [
        {"id": str(uuid4()), "gender": "male"},
        {"id": str(uuid4()), "gender": "male"},
        {"id": str(uuid4()), "gender": "female"},
    ]


@pytest.fixture
def sample_events():
    """Sample performance events with metrics."""
    return [
        {"metrics": {"height_cm": 45.0, "body_mass_kg": 72.0}},
        {"metrics": {"height_cm": 46.0, "body_mass_kg": 73.0}},
        {"metrics": {"height_cm": 44.0, "body_mass_kg": 71.0}},
        {"metrics": {"height_cm": 47.0, "body_mass_kg": 74.0}},
        {"metrics": {"height_cm": 43.0, "body_mass_kg": 75.0}},
    ]


class TestGetBenchmarks:
    """Test GET /api/v1/analysis/benchmarks"""

    def test_benchmarks_cohort(self, mock_supabase, sample_athletes, sample_events):
        """Should return benchmarks for whole cohort."""

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "athletes":
                mock_table.select.return_value.eq.return_value.execute.return_value.data = (
                    sample_athletes
                )
            else:  # performance_events
                mock_table.select.return_value.in_.return_value.execute.return_value.data = (
                    sample_events
                )
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        response = client.get(
            "/api/v1/analysis/benchmarks",
            params={"metric": "height_cm", "reference_group": "cohort"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["mean"] == 45.0  # Mean of 45, 46, 44, 47, 43
        assert data["count"] == 5
        assert data["reference_group"] == "cohort"
        assert data["metric"] == "height_cm"

    def test_benchmarks_by_gender(self, mock_supabase, sample_athletes, sample_events):
        """Should filter benchmarks by gender."""
        male_athletes = [a for a in sample_athletes if a["gender"] == "male"]

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "athletes":
                mock_table.select.return_value.eq.return_value.execute.return_value.data = (
                    sample_athletes
                )
            else:
                mock_table.select.return_value.in_.return_value.execute.return_value.data = (
                    sample_events[:2]  # Only events for male athletes
                )
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        response = client.get(
            "/api/v1/analysis/benchmarks",
            params={"metric": "height_cm", "reference_group": "gender", "gender": "male"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["reference_group"] == "gender"

    def test_benchmarks_gender_required(self, mock_supabase):
        """Should require gender param when reference_group=gender."""
        response = client.get(
            "/api/v1/analysis/benchmarks",
            params={"metric": "height_cm", "reference_group": "gender"},
        )

        assert response.status_code == 400
        assert "Gender parameter required" in response.json()["detail"]

    def test_benchmarks_mass_band_required(self, mock_supabase):
        """Should require mass_band param when reference_group=mass_band."""
        response = client.get(
            "/api/v1/analysis/benchmarks",
            params={"metric": "height_cm", "reference_group": "mass_band"},
        )

        assert response.status_code == 400
        assert "Mass band parameter required" in response.json()["detail"]

    def test_benchmarks_by_mass_band(self, mock_supabase, sample_athletes, sample_events):
        """Should filter benchmarks by mass band."""

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "athletes":
                mock_table.select.return_value.eq.return_value.execute.return_value.data = (
                    sample_athletes
                )
            else:
                mock_table.select.return_value.in_.return_value.execute.return_value.data = (
                    sample_events
                )
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        response = client.get(
            "/api/v1/analysis/benchmarks",
            params={
                "metric": "height_cm",
                "reference_group": "mass_band",
                "mass_band": "70-74.9kg",
            },
        )

        assert response.status_code == 200
        data = response.json()
        # Only events with mass 72, 73, 71, 74 fall in 70-74.9kg band
        assert data["count"] == 4

    def test_benchmarks_no_athletes(self, mock_supabase):
        """Should return zero count when no athletes."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        response = client.get(
            "/api/v1/analysis/benchmarks",
            params={"metric": "height_cm"},
        )

        assert response.status_code == 200
        assert response.json()["count"] == 0

    def test_benchmarks_database_unavailable(self):
        """Should return 503 when database not configured."""
        with patch("app.routers.analysis.get_supabase_client", return_value=None):
            response = client.get(
                "/api/v1/analysis/benchmarks",
                params={"metric": "height_cm"},
            )

        assert response.status_code == 503


class TestGetAthleteZScore:
    """Test GET /api/v1/analysis/athlete/{athlete_id}/zscore"""

    def test_zscore_cohort(self, mock_supabase, sample_athletes, sample_events):
        """Should calculate Z-score against whole cohort."""
        athlete_id = sample_athletes[0]["id"]

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "athletes":
                # First call: verify athlete
                # Second call: get all athletes for reference
                mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                    sample_athletes[0]
                ]
                mock_table.select.return_value.eq.return_value.execute.return_value.data = (
                    sample_athletes
                )
            else:
                # First call: get athlete's event
                # Second call: get all events for reference
                mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
                    {"metrics": {"height_cm": 47.0, "body_mass_kg": 72.0}}
                ]
                mock_table.select.return_value.in_.return_value.execute.return_value.data = (
                    sample_events
                )
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        response = client.get(
            f"/api/v1/analysis/athlete/{athlete_id}/zscore",
            params={"metric": "height_cm", "reference_group": "cohort"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["value"] == 47.0
        assert "z_score" in data
        assert data["mean"] == 45.0
        assert data["reference_group"] == "cohort"

    def test_zscore_athlete_not_found(self, mock_supabase):
        """Should return 404 when athlete not found."""
        mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        response = client.get(
            f"/api/v1/analysis/athlete/{uuid4()}/zscore",
            params={"metric": "height_cm"},
        )

        assert response.status_code == 404

    def test_zscore_no_events(self, mock_supabase, sample_athletes):
        """Should return 404 when no events for athlete."""

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "athletes":
                mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                    sample_athletes[0]
                ]
            else:
                mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = (
                    []
                )
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        response = client.get(
            f"/api/v1/analysis/athlete/{sample_athletes[0]['id']}/zscore",
            params={"metric": "height_cm"},
        )

        assert response.status_code == 404
        assert "No events found" in response.json()["detail"]

    def test_zscore_metric_not_found(self, mock_supabase, sample_athletes):
        """Should return 404 when metric not in event."""

        def table_side_effect(table_name):
            mock_table = MagicMock()
            if table_name == "athletes":
                mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
                    sample_athletes[0]
                ]
            else:
                mock_table.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
                    {"metrics": {"other_metric": 10.0}}
                ]
            return mock_table

        mock_supabase.table.side_effect = table_side_effect

        response = client.get(
            f"/api/v1/analysis/athlete/{sample_athletes[0]['id']}/zscore",
            params={"metric": "height_cm"},
        )

        assert response.status_code == 404
        assert "not found in event" in response.json()["detail"]

    def test_zscore_database_unavailable(self):
        """Should return 503 when database not configured."""
        with patch("app.routers.analysis.get_supabase_client", return_value=None):
            response = client.get(
                f"/api/v1/analysis/athlete/{uuid4()}/zscore",
                params={"metric": "height_cm"},
            )

        assert response.status_code == 503
