"""Session templates API router."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import AuthenticatedUser, get_current_user
from app.core.supabase_client import get_supabase_client
from app.schemas.session_template import (
    SessionTemplateCreate,
    SessionTemplateResponse,
    SessionTemplateUpdate,
)

router = APIRouter(prefix="/session-templates", tags=["session-templates"])


def _get_client():
    """Get Supabase client or raise 503."""
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )
    return client


def _verify_template_ownership(client, template_id: UUID, coach_id: UUID):
    """Verify template belongs to coach. Returns template data or raises 404."""
    response = (
        client.table("session_templates")
        .select("*")
        .eq("id", str(template_id))
        .eq("coach_id", str(coach_id))
        .execute()
    )
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    return response.data[0]


def _load_template_exercises(client, template_id: str):
    """Load exercises for a template."""
    response = (
        client.table("template_exercises")
        .select("*")
        .eq("template_id", template_id)
        .order("order_index")
        .execute()
    )
    return response.data


def _save_template_exercises(client, template_id: str, exercises):
    """Save exercises for a template (replace-all semantics)."""
    # Delete existing exercises
    client.table("template_exercises").delete().eq("template_id", template_id).execute()

    # Insert new exercises
    if exercises:
        rows = []
        for ex in exercises:
            row = {
                "template_id": template_id,
                **ex.model_dump(exclude_unset=False),
            }
            rows.append(row)
        client.table("template_exercises").insert(rows).execute()


@router.post(
    "/",
    response_model=SessionTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_template(
    template: SessionTemplateCreate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Create a new session template with optional exercises."""
    client = _get_client()

    data = {
        "coach_id": str(current_user.id),
        "template_name": template.template_name,
        "training_type": template.training_type,
        "notes": template.notes,
    }

    try:
        response = client.table("session_templates").insert(data).execute()
    except Exception as e:
        if "duplicate key" in str(e).lower() or "unique" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A template with this name already exists",
            )
        raise

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create template",
        )

    template_data = response.data[0]
    template_id = template_data["id"]

    # Save exercises if provided
    if template.exercises:
        _save_template_exercises(client, template_id, template.exercises)

    # Load exercises to return
    template_data["exercises"] = _load_template_exercises(client, template_id)

    return template_data


@router.get(
    "/",
    response_model=List[SessionTemplateResponse],
)
def list_templates(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """List all templates for the current coach."""
    client = _get_client()

    response = (
        client.table("session_templates")
        .select("*")
        .eq("coach_id", str(current_user.id))
        .order("template_name")
        .execute()
    )

    templates = response.data
    for t in templates:
        t["exercises"] = _load_template_exercises(client, t["id"])

    return templates


@router.get(
    "/{template_id}",
    response_model=SessionTemplateResponse,
)
def get_template(
    template_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get a single template with exercises."""
    client = _get_client()
    template_data = _verify_template_ownership(client, template_id, current_user.id)
    template_data["exercises"] = _load_template_exercises(client, str(template_id))
    return template_data


@router.patch(
    "/{template_id}",
    response_model=SessionTemplateResponse,
)
def update_template(
    template_id: UUID,
    template: SessionTemplateUpdate,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Update a session template. If exercises provided, replaces all exercises."""
    client = _get_client()
    _verify_template_ownership(client, template_id, current_user.id)

    update_data = template.model_dump(exclude_unset=True, exclude={"exercises"})

    if update_data:
        try:
            client.table("session_templates").update(update_data).eq(
                "id", str(template_id)
            ).execute()
        except Exception as e:
            if "duplicate key" in str(e).lower() or "unique" in str(e).lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A template with this name already exists",
                )
            raise

    # Replace exercises if provided
    if template.exercises is not None:
        _save_template_exercises(client, str(template_id), template.exercises)

    # Reload and return
    updated = (
        client.table("session_templates")
        .select("*")
        .eq("id", str(template_id))
        .execute()
    )
    result = updated.data[0]
    result["exercises"] = _load_template_exercises(client, str(template_id))
    return result


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_template(
    template_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Delete a session template (cascades to exercises)."""
    client = _get_client()
    _verify_template_ownership(client, template_id, current_user.id)

    client.table("session_templates").delete().eq("id", str(template_id)).execute()

    return None


@router.post(
    "/{template_id}/apply",
    status_code=status.HTTP_201_CREATED,
)
def apply_template(
    template_id: UUID,
    session_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Apply a template to a training session, creating exercise prescriptions.

    For each template exercise with `sets: N`, creates N exercise_prescription rows
    with set_number 1..N.
    """
    client = _get_client()

    # Verify template ownership
    _verify_template_ownership(client, template_id, current_user.id)

    # Verify session belongs to coach's athlete
    session_resp = (
        client.table("training_sessions")
        .select("athlete_id")
        .eq("id", str(session_id))
        .execute()
    )
    if not session_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    athlete_id = session_resp.data[0]["athlete_id"]
    athlete_resp = (
        client.table("athletes")
        .select("id")
        .eq("id", str(athlete_id))
        .eq("coach_id", str(current_user.id))
        .execute()
    )
    if not athlete_resp.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Training session not found",
        )

    # Load template exercises
    exercises = _load_template_exercises(client, str(template_id))

    # Create exercise prescriptions with set expansion
    prescriptions = []
    for ex in exercises:
        num_sets = ex.get("sets", 1) or 1
        for set_num in range(1, num_sets + 1):
            prescriptions.append({
                "session_id": str(session_id),
                "exercise_name": ex["exercise_name"],
                "exercise_category": ex.get("exercise_category"),
                "set_number": set_num,
                "reps": ex.get("reps"),
                "weight_kg": ex.get("weight_kg"),
                "tempo": ex.get("tempo"),
                "rest_seconds": ex.get("rest_seconds"),
                "duration_seconds": ex.get("duration_seconds"),
                "distance_meters": ex.get("distance_meters"),
            })

    if prescriptions:
        response = client.table("exercise_prescriptions").insert(prescriptions).execute()
        return response.data

    return []
