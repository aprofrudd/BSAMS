"""Athletes API router."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_current_user
from app.core.supabase_client import get_supabase_client
from app.schemas.athlete import AthleteCreate, AthleteResponse, AthleteUpdate

router = APIRouter(prefix="/athletes", tags=["athletes"])


@router.get("/", response_model=List[AthleteResponse])
async def list_athletes(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Maximum records to return"),
    current_user: UUID = Depends(get_current_user),
):
    """
    List all athletes for the current coach.

    Returns a paginated list of athletes belonging to the authenticated coach.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    response = (
        client.table("athletes")
        .select("*")
        .eq("coach_id", str(current_user))
        .range(skip, skip + limit - 1)
        .execute()
    )

    return response.data


@router.get("/{athlete_id}", response_model=AthleteResponse)
async def get_athlete(
    athlete_id: UUID,
    current_user: UUID = Depends(get_current_user),
):
    """
    Get a single athlete by ID.

    Returns the athlete if found and belongs to the current coach.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    response = (
        client.table("athletes")
        .select("*")
        .eq("id", str(athlete_id))
        .eq("coach_id", str(current_user))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete not found",
        )

    return response.data[0]


@router.post("/", response_model=AthleteResponse, status_code=status.HTTP_201_CREATED)
async def create_athlete(
    athlete: AthleteCreate,
    current_user: UUID = Depends(get_current_user),
):
    """
    Create a new athlete.

    Creates an athlete record for the current coach.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    data = athlete.model_dump()
    data["coach_id"] = str(current_user)
    data["gender"] = data["gender"].value  # Convert enum to string

    # Convert date to ISO format string if present
    if data.get("date_of_birth"):
        data["date_of_birth"] = data["date_of_birth"].isoformat()

    response = client.table("athletes").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create athlete",
        )

    return response.data[0]


@router.patch("/{athlete_id}", response_model=AthleteResponse)
async def update_athlete(
    athlete_id: UUID,
    athlete: AthleteUpdate,
    current_user: UUID = Depends(get_current_user),
):
    """
    Update an existing athlete.

    Updates the athlete if found and belongs to the current coach.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # First check if athlete exists and belongs to coach
    existing = (
        client.table("athletes")
        .select("id")
        .eq("id", str(athlete_id))
        .eq("coach_id", str(current_user))
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete not found",
        )

    # Build update data, excluding None values
    update_data = athlete.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    # Convert enum to string if present
    if "gender" in update_data and update_data["gender"]:
        update_data["gender"] = update_data["gender"].value

    # Convert date to ISO format string if present
    if "date_of_birth" in update_data and update_data["date_of_birth"]:
        update_data["date_of_birth"] = update_data["date_of_birth"].isoformat()

    response = (
        client.table("athletes")
        .update(update_data)
        .eq("id", str(athlete_id))
        .eq("coach_id", str(current_user))
        .execute()
    )

    return response.data[0]


@router.delete("/{athlete_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_athlete(
    athlete_id: UUID,
    current_user: UUID = Depends(get_current_user),
):
    """
    Delete an athlete.

    Deletes the athlete if found and belongs to the current coach.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Check if athlete exists and belongs to coach
    existing = (
        client.table("athletes")
        .select("id")
        .eq("id", str(athlete_id))
        .eq("coach_id", str(current_user))
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete not found",
        )

    client.table("athletes").delete().eq("id", str(athlete_id)).eq(
        "coach_id", str(current_user)
    ).execute()

    return None
