"""Training sessions API router."""

from datetime import date, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import AuthenticatedUser, get_current_user
from app.core.supabase_client import get_supabase_client
from app.schemas.training_session import (
    TrainingSessionCreate,
    TrainingSessionResponse,
    TrainingSessionUpdate,
)
from app.services.training_load import TrainingLoadEngine

router = APIRouter(prefix="/training", tags=["training"])


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


@router.post(
    "/sessions/",
    response_model=TrainingSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_training_session(
    session: TrainingSessionCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Create a new training session for an athlete."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    if not _verify_athlete_ownership(client, session.athlete_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete not found",
        )

    data = {
        "athlete_id": str(session.athlete_id),
        "session_date": session.session_date.isoformat(),
        "training_type": session.training_type,
        "duration_minutes": session.duration_minutes,
        "rpe": session.rpe,
        "notes": session.notes,
        "metrics": session.metrics,
    }

    response = client.table("training_sessions").insert(data).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create training session",
        )

    return response.data[0]


@router.get(
    "/sessions/athlete/{athlete_id}",
    response_model=List[TrainingSessionResponse],
)
def list_training_sessions(
    athlete_id: UUID,
    start_date: Optional[date] = Query(None, description="Filter from this date"),
    end_date: Optional[date] = Query(None, description="Filter until this date"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Maximum records to return"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """List training sessions for an athlete with optional pagination and date filtering."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    if not _verify_athlete_ownership(client, athlete_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete not found",
        )

    query = (
        client.table("training_sessions")
        .select("*")
        .eq("athlete_id", str(athlete_id))
    )

    if start_date:
        query = query.gte("session_date", start_date.isoformat())
    if end_date:
        query = query.lte("session_date", end_date.isoformat())

    response = query.order("session_date", desc=True).range(skip, skip + limit - 1).execute()

    return response.data


@router.get(
    "/sessions/{session_id}",
    response_model=TrainingSessionResponse,
)
def get_training_session(
    session_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get a single training session by ID."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    response = (
        client.table("training_sessions")
        .select("*")
        .eq("id", str(session_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    session = response.data[0]

    if not _verify_athlete_ownership(client, UUID(session["athlete_id"]), current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    return session


@router.patch(
    "/sessions/{session_id}",
    response_model=TrainingSessionResponse,
)
def update_training_session(
    session_id: UUID,
    session: TrainingSessionUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Update an existing training session."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    existing = (
        client.table("training_sessions")
        .select("*")
        .eq("id", str(session_id))
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    if not _verify_athlete_ownership(
        client, UUID(existing.data[0]["athlete_id"]), current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    update_data = session.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    if "session_date" in update_data and update_data["session_date"]:
        update_data["session_date"] = update_data["session_date"].isoformat()

    response = (
        client.table("training_sessions")
        .update(update_data)
        .eq("id", str(session_id))
        .execute()
    )

    return response.data[0]


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_training_session(
    session_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Delete a training session."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    existing = (
        client.table("training_sessions")
        .select("*")
        .eq("id", str(session_id))
        .execute()
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    if not _verify_athlete_ownership(
        client, UUID(existing.data[0]["athlete_id"]), current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    client.table("training_sessions").delete().eq("id", str(session_id)).execute()

    return None


@router.get(
    "/analysis/load/{athlete_id}",
    response_model=Dict[str, Any],
)
def get_training_load(
    athlete_id: UUID,
    days: int = Query(28, ge=7, le=90, description="Number of days to analyze"),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get training load analysis for an athlete."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    if not _verify_athlete_ownership(client, athlete_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete not found",
        )

    target_date = date.today()
    start_date = target_date - timedelta(days=days - 1)

    response = (
        client.table("training_sessions")
        .select("*")
        .eq("athlete_id", str(athlete_id))
        .gte("session_date", start_date.isoformat())
        .lte("session_date", target_date.isoformat())
        .execute()
    )

    analysis = TrainingLoadEngine.analyze(
        sessions=response.data,
        days=days,
        target_date=target_date,
    )

    return {
        "daily_loads": [
            {
                "date": dl.date.isoformat(),
                "total_srpe": dl.total_srpe,
                "session_count": dl.session_count,
            }
            for dl in analysis.daily_loads
        ],
        "weekly_load": analysis.weekly_load,
        "monotony": analysis.monotony,
        "strain": analysis.strain,
        "acwr": analysis.acwr,
        "acute_load": analysis.acute_load,
        "chronic_load": analysis.chronic_load,
    }
