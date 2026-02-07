"""Exercise prescriptions API router (nested under training sessions)."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import AuthenticatedUser, get_current_user
from app.core.supabase_client import get_supabase_client
from app.schemas.exercise_prescription import (
    ExercisePrescriptionCreate,
    ExercisePrescriptionResponse,
    ExercisePrescriptionUpdate,
)

router = APIRouter(prefix="/training/sessions", tags=["exercises"])


def _verify_session_ownership(client, session_id: UUID, coach_id: UUID) -> bool:
    """Verify that the training session belongs to an athlete of the coach."""
    response = (
        client.table("training_sessions")
        .select("athlete_id")
        .eq("id", str(session_id))
        .execute()
    )
    if not response.data:
        return False

    athlete_id = response.data[0]["athlete_id"]
    athlete_response = (
        client.table("athletes")
        .select("id")
        .eq("id", str(athlete_id))
        .eq("coach_id", str(coach_id))
        .execute()
    )
    return bool(athlete_response.data)


@router.post(
    "/{session_id}/exercises/",
    response_model=ExercisePrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_exercise(
    session_id: UUID,
    exercise: ExercisePrescriptionCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Create a new exercise prescription for a training session."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    if not _verify_session_ownership(client, session_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    data = {
        "session_id": str(session_id),
        **exercise.model_dump(exclude_unset=False),
    }

    response = client.table("exercise_prescriptions").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create exercise",
        )

    return response.data[0]


@router.get(
    "/{session_id}/exercises/",
    response_model=List[ExercisePrescriptionResponse],
)
def list_exercises(
    session_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """List all exercises for a training session."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    if not _verify_session_ownership(client, session_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    response = (
        client.table("exercise_prescriptions")
        .select("*")
        .eq("session_id", str(session_id))
        .order("set_number")
        .execute()
    )

    return response.data


@router.patch(
    "/{session_id}/exercises/{exercise_id}",
    response_model=ExercisePrescriptionResponse,
)
def update_exercise(
    session_id: UUID,
    exercise_id: UUID,
    exercise: ExercisePrescriptionUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Update an exercise prescription."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    if not _verify_session_ownership(client, session_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    # Verify exercise exists and belongs to this session
    existing = (
        client.table("exercise_prescriptions")
        .select("*")
        .eq("id", str(exercise_id))
        .eq("session_id", str(session_id))
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )

    update_data = exercise.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    response = (
        client.table("exercise_prescriptions")
        .update(update_data)
        .eq("id", str(exercise_id))
        .execute()
    )

    return response.data[0]


@router.delete(
    "/{session_id}/exercises/{exercise_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_exercise(
    session_id: UUID,
    exercise_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Delete an exercise prescription."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    if not _verify_session_ownership(client, session_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    existing = (
        client.table("exercise_prescriptions")
        .select("*")
        .eq("id", str(exercise_id))
        .eq("session_id", str(session_id))
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exercise not found",
        )

    client.table("exercise_prescriptions").delete().eq("id", str(exercise_id)).execute()

    return None
