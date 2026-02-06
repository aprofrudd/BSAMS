"""Performance events API router."""

from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import AuthenticatedUser, get_current_user
from app.core.supabase_client import get_supabase_client
from app.schemas.performance_event import (
    PerformanceEventCreate,
    PerformanceEventResponse,
    PerformanceEventUpdate,
)

router = APIRouter(prefix="/events", tags=["events"])


def _verify_athlete_ownership(client, athlete_id: UUID, coach_id: UUID) -> bool:
    """Verify that the athlete belongs to the coach."""
    response = (
        client.table("athletes")
        .select("id")
        .eq("id", str(athlete_id))
        .eq("coach_id", str(coach_id))
        .execute()
    )
    return bool(response.data)


@router.get("/athlete/{athlete_id}", response_model=List[PerformanceEventResponse])
async def list_events_for_athlete(
    athlete_id: UUID,
    start_date: Optional[date] = Query(None, description="Filter events from this date"),
    end_date: Optional[date] = Query(None, description="Filter events until this date"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Maximum records to return"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    List performance events for an athlete with optional pagination and date filtering.

    Returns events for the specified athlete.
    Only returns events if the athlete belongs to the current coach.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Verify athlete belongs to coach
    if not _verify_athlete_ownership(client, athlete_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete not found",
        )

    query = (
        client.table("performance_events")
        .select("*")
        .eq("athlete_id", str(athlete_id))
    )

    if start_date:
        query = query.gte("event_date", start_date.isoformat())
    if end_date:
        query = query.lte("event_date", end_date.isoformat())

    response = query.order("event_date", desc=True).range(skip, skip + limit - 1).execute()

    return response.data


@router.get("/{event_id}", response_model=PerformanceEventResponse)
async def get_event(
    event_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Get a single performance event by ID.

    Returns the event if found and belongs to an athlete of the current coach.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Get event with athlete info to verify ownership
    response = client.table("performance_events").select("*").eq("id", str(event_id)).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    event = response.data[0]

    # Verify athlete belongs to coach
    if not _verify_athlete_ownership(client, UUID(event["athlete_id"]), current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    return event


@router.post("/", response_model=PerformanceEventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event: PerformanceEventCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Create a new performance event.

    Creates an event record for the specified athlete.
    Only succeeds if the athlete belongs to the current coach.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Verify athlete belongs to coach
    if not _verify_athlete_ownership(client, event.athlete_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete not found",
        )

    data = {
        "athlete_id": str(event.athlete_id),
        "event_date": event.event_date.isoformat(),
        "metrics": event.metrics,
    }

    response = client.table("performance_events").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create event",
        )

    return response.data[0]


@router.patch("/{event_id}", response_model=PerformanceEventResponse)
async def update_event(
    event_id: UUID,
    event: PerformanceEventUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Update an existing performance event.

    Updates the event if found and belongs to an athlete of the current coach.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Get existing event
    existing = client.table("performance_events").select("*").eq("id", str(event_id)).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    # Verify athlete belongs to coach
    if not _verify_athlete_ownership(
        client, UUID(existing.data[0]["athlete_id"]), current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    # Build update data
    update_data = event.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Convert date to ISO format if present
    if "event_date" in update_data and update_data["event_date"]:
        update_data["event_date"] = update_data["event_date"].isoformat()

    response = (
        client.table("performance_events").update(update_data).eq("id", str(event_id)).execute()
    )

    return response.data[0]


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Delete a performance event.

    Deletes the event if found and belongs to an athlete of the current coach.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Get existing event
    existing = client.table("performance_events").select("*").eq("id", str(event_id)).execute()

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    # Verify athlete belongs to coach
    if not _verify_athlete_ownership(
        client, UUID(existing.data[0]["athlete_id"]), current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )

    client.table("performance_events").delete().eq("id", str(event_id)).execute()

    return None
