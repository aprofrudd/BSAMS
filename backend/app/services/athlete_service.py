"""Athlete service for business logic."""

from typing import List, Optional
from uuid import UUID

from app.core.supabase_client import get_supabase_client
from app.schemas.athlete import AthleteCreate, AthleteResponse, AthleteUpdate


class AthleteService:
    """Service class for athlete operations."""

    def __init__(self, coach_id: UUID):
        """Initialize with the coach's user ID."""
        self.coach_id = coach_id
        self.client = get_supabase_client()

    def _check_client(self):
        """Verify Supabase client is available."""
        if not self.client:
            raise RuntimeError("Database not configured")

    def list_athletes(self) -> List[dict]:
        """
        List all athletes for the coach.

        Returns:
            List of athlete records.
        """
        self._check_client()

        response = (
            self.client.table("athletes")
            .select("*")
            .eq("coach_id", str(self.coach_id))
            .execute()
        )

        return response.data

    def get_athlete(self, athlete_id: UUID) -> Optional[dict]:
        """
        Get a single athlete by ID.

        Args:
            athlete_id: The athlete's UUID.

        Returns:
            Athlete record if found, None otherwise.
        """
        self._check_client()

        response = (
            self.client.table("athletes")
            .select("*")
            .eq("id", str(athlete_id))
            .eq("coach_id", str(self.coach_id))
            .execute()
        )

        return response.data[0] if response.data else None

    def create_athlete(self, athlete: AthleteCreate) -> dict:
        """
        Create a new athlete.

        Args:
            athlete: Athlete creation data.

        Returns:
            Created athlete record.

        Raises:
            RuntimeError: If creation fails.
        """
        self._check_client()

        data = athlete.model_dump()
        data["coach_id"] = str(self.coach_id)
        data["gender"] = data["gender"].value

        if data.get("date_of_birth"):
            data["date_of_birth"] = data["date_of_birth"].isoformat()

        response = self.client.table("athletes").insert(data).execute()

        if not response.data:
            raise RuntimeError("Failed to create athlete")

        return response.data[0]

    def update_athlete(
        self, athlete_id: UUID, update_data: AthleteUpdate
    ) -> Optional[dict]:
        """
        Update an existing athlete.

        Args:
            athlete_id: The athlete's UUID.
            update_data: Fields to update.

        Returns:
            Updated athlete record if found, None otherwise.
        """
        self._check_client()

        # Verify athlete exists and belongs to coach
        existing = self.get_athlete(athlete_id)
        if not existing:
            return None

        data = update_data.model_dump(exclude_unset=True)
        if not data:
            return existing  # Nothing to update

        if "gender" in data and data["gender"]:
            data["gender"] = data["gender"].value

        if "date_of_birth" in data and data["date_of_birth"]:
            data["date_of_birth"] = data["date_of_birth"].isoformat()

        response = (
            self.client.table("athletes")
            .update(data)
            .eq("id", str(athlete_id))
            .eq("coach_id", str(self.coach_id))
            .execute()
        )

        return response.data[0] if response.data else None

    def delete_athlete(self, athlete_id: UUID) -> bool:
        """
        Delete an athlete.

        Args:
            athlete_id: The athlete's UUID.

        Returns:
            True if deleted, False if not found.
        """
        self._check_client()

        # Verify athlete exists and belongs to coach
        existing = self.get_athlete(athlete_id)
        if not existing:
            return False

        self.client.table("athletes").delete().eq("id", str(athlete_id)).eq(
            "coach_id", str(self.coach_id)
        ).execute()

        return True

    def athlete_belongs_to_coach(self, athlete_id: UUID) -> bool:
        """
        Check if an athlete belongs to this coach.

        Args:
            athlete_id: The athlete's UUID.

        Returns:
            True if athlete belongs to coach, False otherwise.
        """
        return self.get_athlete(athlete_id) is not None
