"""Tests for event service."""

from datetime import date
from unittest.mock import MagicMock, patch
from uuid import UUID, uuid4

import pytest

from app.schemas.performance_event import PerformanceEventCreate, PerformanceEventUpdate
from app.services.event_service import EventService


@pytest.fixture
def coach_id():
    """Sample coach ID."""
    return UUID("00000000-0000-0000-0000-000000000001")


@pytest.fixture
def athlete_id():
    """Sample athlete ID."""
    return uuid4()


@pytest.fixture
def mock_client():
    """Mock Supabase client."""
    with patch("app.services.event_service.get_supabase_client") as mock:
        client = MagicMock()
        mock.return_value = client
        yield client


@pytest.fixture
def mock_athlete_service():
    """Mock AthleteService."""
    with patch("app.services.event_service.AthleteService") as mock:
        yield mock


@pytest.fixture
def service(coach_id, mock_client, mock_athlete_service):
    """Create EventService instance with mocked dependencies."""
    service = EventService(coach_id)
    return service


@pytest.fixture
def sample_event(athlete_id):
    """Sample event data."""
    return {
        "id": str(uuid4()),
        "athlete_id": str(athlete_id),
        "event_date": "2024-01-15",
        "metrics": {"test_type": "CMJ", "height_cm": 45.5},
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
    }


class TestEventServiceInit:
    """Test EventService initialization."""

    def test_init_with_coach_id(self, coach_id, mock_client, mock_athlete_service):
        """Should initialize with coach ID."""
        service = EventService(coach_id)
        assert service.coach_id == coach_id

    def test_raises_when_no_client(self, coach_id, mock_athlete_service):
        """Should raise when client not available."""
        with patch("app.services.event_service.get_supabase_client", return_value=None):
            service = EventService(coach_id)
            with pytest.raises(RuntimeError, match="Database not configured"):
                service.list_events_for_athlete(uuid4())


class TestListEventsForAthlete:
    """Test list_events_for_athlete method."""

    def test_returns_events(self, service, mock_client, athlete_id, sample_event):
        """Should return list of events."""
        service.athlete_service.athlete_belongs_to_coach.return_value = True
        mock_client.table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value.data = [
            sample_event
        ]

        result = service.list_events_for_athlete(athlete_id)

        assert len(result) == 1
        assert result[0]["metrics"]["test_type"] == "CMJ"

    def test_returns_none_when_athlete_not_owned(
        self, service, mock_client, athlete_id
    ):
        """Should return None when athlete doesn't belong to coach."""
        service.athlete_service.athlete_belongs_to_coach.return_value = False

        result = service.list_events_for_athlete(athlete_id)

        assert result is None

    def test_filters_by_date_range(self, service, mock_client, athlete_id, sample_event):
        """Should apply date filters."""
        service.athlete_service.athlete_belongs_to_coach.return_value = True

        mock_query = MagicMock()
        mock_client.table.return_value.select.return_value.eq.return_value = mock_query
        mock_query.gte.return_value = mock_query
        mock_query.lte.return_value = mock_query
        mock_query.order.return_value.execute.return_value.data = [sample_event]

        result = service.list_events_for_athlete(
            athlete_id, start_date=date(2024, 1, 1), end_date=date(2024, 12, 31)
        )

        mock_query.gte.assert_called_once_with("event_date", "2024-01-01")
        mock_query.lte.assert_called_once_with("event_date", "2024-12-31")
        assert len(result) == 1


class TestGetEvent:
    """Test get_event method."""

    def test_returns_event(self, service, mock_client, sample_event, athlete_id):
        """Should return event when found."""
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            sample_event
        ]
        service.athlete_service.athlete_belongs_to_coach.return_value = True

        result = service.get_event(UUID(sample_event["id"]))

        assert result["metrics"]["test_type"] == "CMJ"

    def test_returns_none_when_not_found(self, service, mock_client):
        """Should return None when event not found."""
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.get_event(uuid4())

        assert result is None

    def test_returns_none_when_athlete_not_owned(
        self, service, mock_client, sample_event
    ):
        """Should return None when athlete doesn't belong to coach."""
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            sample_event
        ]
        service.athlete_service.athlete_belongs_to_coach.return_value = False

        result = service.get_event(UUID(sample_event["id"]))

        assert result is None


class TestCreateEvent:
    """Test create_event method."""

    def test_creates_event(self, service, mock_client, sample_event, athlete_id):
        """Should create and return event."""
        service.athlete_service.athlete_belongs_to_coach.return_value = True
        mock_client.table.return_value.insert.return_value.execute.return_value.data = [
            sample_event
        ]

        event_data = PerformanceEventCreate(
            athlete_id=athlete_id,
            event_date=date(2024, 1, 15),
            metrics={"test_type": "CMJ", "height_cm": 45.5},
        )

        result = service.create_event(event_data)

        assert result["metrics"]["test_type"] == "CMJ"

    def test_returns_none_when_athlete_not_owned(self, service, mock_client, athlete_id):
        """Should return None when athlete doesn't belong to coach."""
        service.athlete_service.athlete_belongs_to_coach.return_value = False

        event_data = PerformanceEventCreate(
            athlete_id=athlete_id,
            event_date=date(2024, 1, 15),
            metrics={"test_type": "CMJ"},
        )

        result = service.create_event(event_data)

        assert result is None

    def test_raises_on_failure(self, service, mock_client, athlete_id):
        """Should raise when creation fails."""
        service.athlete_service.athlete_belongs_to_coach.return_value = True
        mock_client.table.return_value.insert.return_value.execute.return_value.data = (
            []
        )

        event_data = PerformanceEventCreate(
            athlete_id=athlete_id,
            event_date=date(2024, 1, 15),
            metrics={"test_type": "CMJ"},
        )

        with pytest.raises(RuntimeError, match="Failed to create event"):
            service.create_event(event_data)


class TestUpdateEvent:
    """Test update_event method."""

    def test_updates_event(self, service, mock_client, sample_event):
        """Should update and return event."""
        # Mock get_event
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            sample_event
        ]
        service.athlete_service.athlete_belongs_to_coach.return_value = True

        # Mock update
        sample_event["metrics"]["height_cm"] = 46.0
        mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
            sample_event
        ]

        update_data = PerformanceEventUpdate(metrics={"height_cm": 46.0})
        result = service.update_event(UUID(sample_event["id"]), update_data)

        assert result["metrics"]["height_cm"] == 46.0

    def test_returns_none_when_not_found(self, service, mock_client):
        """Should return None when event not found."""
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        update_data = PerformanceEventUpdate(metrics={"height_cm": 46.0})
        result = service.update_event(uuid4(), update_data)

        assert result is None


class TestDeleteEvent:
    """Test delete_event method."""

    def test_deletes_event(self, service, mock_client, sample_event):
        """Should delete event and return True."""
        # Mock get_event
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            sample_event
        ]
        service.athlete_service.athlete_belongs_to_coach.return_value = True

        # Mock delete
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = (
            None
        )

        result = service.delete_event(UUID(sample_event["id"]))

        assert result is True

    def test_returns_false_when_not_found(self, service, mock_client):
        """Should return False when event not found."""
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            []
        )

        result = service.delete_event(uuid4())

        assert result is False
