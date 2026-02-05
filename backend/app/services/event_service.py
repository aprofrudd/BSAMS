"""Event service for business logic."""

from datetime import date
from typing import List, Optional
from uuid import UUID

from app.core.supabase_client import get_supabase_client
from app.schemas.performance_event import PerformanceEventCreate, PerformanceEventUpdate
from app.services.athlete_service import AthleteService


class EventService:
    """Service class for performance event operations."""

    def __init__(self, coach_id: UUID):
        """Initialize with the coach's user ID."""
        self.coach_id = coach_id
        self.client = get_supabase_client()
        self.athlete_service = AthleteService(coach_id)

    def _check_client(self):
        """Verify Supabase client is available."""
        if not self.client:
            raise RuntimeError("Database not configured")

    def list_events_for_athlete(
        self,
        athlete_id: UUID,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Optional[List[dict]]:
        """
        List all events for an athlete.

        Args:
            athlete_id: The athlete's UUID.
            start_date: Optional start date filter.
            end_date: Optional end date filter.

        Returns:
            List of event records if athlete belongs to coach, None otherwise.
        """
        self._check_client()

        # Verify athlete belongs to coach
        if not self.athlete_service.athlete_belongs_to_coach(athlete_id):
            return None

        query = (
            self.client.table("performance_events")
            .select("*")
            .eq("athlete_id", str(athlete_id))
        )

        if start_date:
            query = query.gte("event_date", start_date.isoformat())
        if end_date:
            query = query.lte("event_date", end_date.isoformat())

        response = query.order("event_date", desc=True).execute()

        return response.data

    def get_event(self, event_id: UUID) -> Optional[dict]:
        """
        Get a single event by ID.

        Args:
            event_id: The event's UUID.

        Returns:
            Event record if found and accessible, None otherwise.
        """
        self._check_client()

        response = (
            self.client.table("performance_events")
            .select("*")
            .eq("id", str(event_id))
            .execute()
        )

        if not response.data:
            return None

        event = response.data[0]

        # Verify athlete belongs to coach
        if not self.athlete_service.athlete_belongs_to_coach(UUID(event["athlete_id"])):
            return None

        return event

    def create_event(self, event: PerformanceEventCreate) -> Optional[dict]:
        """
        Create a new performance event.

        Args:
            event: Event creation data.

        Returns:
            Created event record if successful, None if athlete not found.

        Raises:
            RuntimeError: If creation fails.
        """
        self._check_client()

        # Verify athlete belongs to coach
        if not self.athlete_service.athlete_belongs_to_coach(event.athlete_id):
            return None

        data = {
            "athlete_id": str(event.athlete_id),
            "event_date": event.event_date.isoformat(),
            "metrics": event.metrics,
        }

        response = self.client.table("performance_events").insert(data).execute()

        if not response.data:
            raise RuntimeError("Failed to create event")

        return response.data[0]

    def update_event(
        self, event_id: UUID, update_data: PerformanceEventUpdate
    ) -> Optional[dict]:
        """
        Update an existing event.

        Args:
            event_id: The event's UUID.
            update_data: Fields to update.

        Returns:
            Updated event record if found, None otherwise.
        """
        self._check_client()

        # Verify event exists and is accessible
        existing = self.get_event(event_id)
        if not existing:
            return None

        data = update_data.model_dump(exclude_unset=True)
        if not data:
            return existing  # Nothing to update

        if "event_date" in data and data["event_date"]:
            data["event_date"] = data["event_date"].isoformat()

        response = (
            self.client.table("performance_events")
            .update(data)
            .eq("id", str(event_id))
            .execute()
        )

        return response.data[0] if response.data else None

    def delete_event(self, event_id: UUID) -> bool:
        """
        Delete a performance event.

        Args:
            event_id: The event's UUID.

        Returns:
            True if deleted, False if not found.
        """
        self._check_client()

        # Verify event exists and is accessible
        existing = self.get_event(event_id)
        if not existing:
            return False

        self.client.table("performance_events").delete().eq(
            "id", str(event_id)
        ).execute()

        return True
