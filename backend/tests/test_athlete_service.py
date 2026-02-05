"""Tests for athlete service."""

from datetime import date
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest

from app.schemas.athlete import AthleteCreate, AthleteUpdate
from app.schemas.enums import Gender
from app.services.athlete_service import AthleteService


@pytest.fixture
def coach_id():
    """Sample coach ID."""
    return UUID("00000000-0000-0000-0000-000000000001")


@pytest.fixture
def mock_client():
    """Mock Supabase client."""
    with patch("app.services.athlete_service.get_supabase_client") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def service(coach_id, mock_client):
    """Create AthleteService instance with mocked client."""
    return AthleteService(coach_id)


@pytest.fixture
def sample_athlete():
    """Sample athlete data."""
    return {
        "id": str(uuid4()),
        "coach_id": "00000000-0000-0000-0000-000000000001",
        "name": "Test Athlete",
        "gender": "male",
        "date_of_birth": "1995-05-15",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
    }


class TestAthleteServiceInit:
    """Test AthleteService initialization."""

    def test_init_with_coach_id(self, coach_id, mock_client):
        """Should initialize with coach ID."""
        service = AthleteService(coach_id)
        assert service.coach_id == coach_id

    def test_raises_when_no_client(self, coach_id):
        """Should raise when client not available."""
        with patch(
            "app.services.athlete_service.get_supabase_client", return_value=None
        ):
            service = AthleteService(coach_id)
            with pytest.raises(RuntimeError, match="Database not configured"):
                service.list_athletes()


class TestListAthletes:
    """Test list_athletes method."""

    def test_returns_athletes(self, service, mock_client, sample_athlete):
        """Should return list of athletes."""
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            sample_athlete
        ]

        result = service.list_athletes()

        assert len(result) == 1
        assert result[0]["name"] == "Test Athlete"

    def test_returns_empty_list(self, service, mock_client):
        """Should return empty list when no athletes."""
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.list_athletes()

        assert result == []


class TestGetAthlete:
    """Test get_athlete method."""

    def test_returns_athlete(self, service, mock_client, sample_athlete):
        """Should return athlete when found."""
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            sample_athlete
        ]

        result = service.get_athlete(UUID(sample_athlete["id"]))

        assert result["name"] == "Test Athlete"

    def test_returns_none_when_not_found(self, service, mock_client):
        """Should return None when not found."""
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.get_athlete(uuid4())

        assert result is None


class TestCreateAthlete:
    """Test create_athlete method."""

    def test_creates_athlete(self, service, mock_client, sample_athlete):
        """Should create and return athlete."""
        mock_client.table.return_value.insert.return_value.execute.return_value.data = [
            sample_athlete
        ]

        athlete_data = AthleteCreate(
            name="Test Athlete",
            gender=Gender.MALE,
            date_of_birth=date(1995, 5, 15),
        )

        result = service.create_athlete(athlete_data)

        assert result["name"] == "Test Athlete"

    def test_raises_on_failure(self, service, mock_client):
        """Should raise when creation fails."""
        mock_client.table.return_value.insert.return_value.execute.return_value.data = (
            []
        )

        athlete_data = AthleteCreate(name="Test", gender=Gender.MALE)

        with pytest.raises(RuntimeError, match="Failed to create athlete"):
            service.create_athlete(athlete_data)


class TestUpdateAthlete:
    """Test update_athlete method."""

    def test_updates_athlete(self, service, mock_client, sample_athlete):
        """Should update and return athlete."""
        # First call - get existing
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            sample_athlete
        ]
        # Second call - update
        sample_athlete["name"] = "Updated Name"
        mock_client.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            sample_athlete
        ]

        update_data = AthleteUpdate(name="Updated Name")
        result = service.update_athlete(UUID(sample_athlete["id"]), update_data)

        assert result["name"] == "Updated Name"

    def test_returns_none_when_not_found(self, service, mock_client):
        """Should return None when athlete not found."""
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        update_data = AthleteUpdate(name="Updated")
        result = service.update_athlete(uuid4(), update_data)

        assert result is None


class TestDeleteAthlete:
    """Test delete_athlete method."""

    def test_deletes_athlete(self, service, mock_client, sample_athlete):
        """Should delete athlete and return True."""
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            sample_athlete
        ]
        mock_client.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value = (
            None
        )

        result = service.delete_athlete(UUID(sample_athlete["id"]))

        assert result is True

    def test_returns_false_when_not_found(self, service, mock_client):
        """Should return False when athlete not found."""
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.delete_athlete(uuid4())

        assert result is False


class TestAthleteBelongsToCoach:
    """Test athlete_belongs_to_coach method."""

    def test_returns_true_when_belongs(self, service, mock_client, sample_athlete):
        """Should return True when athlete belongs to coach."""
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
            sample_athlete
        ]

        result = service.athlete_belongs_to_coach(UUID(sample_athlete["id"]))

        assert result is True

    def test_returns_false_when_not_belongs(self, service, mock_client):
        """Should return False when athlete doesn't belong."""
        mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.athlete_belongs_to_coach(uuid4())

        assert result is False
