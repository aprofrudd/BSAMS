"""Upload API router for CSV file processing."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status

from app.core.security import get_current_user
from app.core.supabase_client import get_supabase_client
from app.schemas.upload import CSVUploadResult
from app.services.csv_ingestion import CSVIngestionService

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/csv", response_model=CSVUploadResult, status_code=status.HTTP_201_CREATED)
async def upload_csv(
    file: UploadFile = File(..., description="CSV file to upload"),
    athlete_id: Optional[UUID] = Query(None, description="Athlete ID to associate with all rows"),
    current_user: UUID = Depends(get_current_user),
):
    """
    Upload and process a CSV file containing performance data.

    The CSV should have columns for Date (DD/MM/YYYY format) and metrics
    like "CMJ Height (cm)". Optionally include "Body Mass (kg)" and "Athlete" columns.

    If athlete_id is provided, all rows will be associated with that athlete.
    Otherwise, rows must have an "Athlete" column for matching.
    """
    # Validate file type
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file",
        )

    # Read file content
    try:
        content = await file.read()
        csv_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded",
        )

    # Validate CSV structure
    ingestion_service = CSVIngestionService()
    warnings = ingestion_service.validate_csv_structure(csv_content)

    # Check for critical warnings (missing date column)
    critical_warnings = [w for w in warnings if "date column" in w.lower() and "optional" not in w.lower()]
    if critical_warnings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=critical_warnings[0],
        )

    # Process CSV
    events, errors = ingestion_service.process_csv(csv_content, athlete_id=athlete_id)

    if not events and not errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid data found in CSV. Check column names and date format (DD/MM/YYYY).",
        )

    # Get Supabase client
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Store events in database
    processed_count = 0
    athlete_cache: dict[str, str] = {}  # name -> id cache

    # If athlete_id provided, verify once upfront
    if athlete_id:
        athlete_check = (
            client.table("athletes")
            .select("id")
            .eq("id", str(athlete_id))
            .eq("coach_id", str(current_user))
            .execute()
        )
        if not athlete_check.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Athlete not found",
            )

    for event in events:
        try:
            resolved_athlete_id = None

            if athlete_id:
                resolved_athlete_id = str(athlete_id)

            elif "athlete_name" in event:
                athlete_name = event["athlete_name"]

                if athlete_name in athlete_cache:
                    resolved_athlete_id = athlete_cache[athlete_name]
                else:
                    # Look up athlete by name for this coach
                    athlete_result = (
                        client.table("athletes")
                        .select("id")
                        .eq("coach_id", str(current_user))
                        .eq("name", athlete_name)
                        .execute()
                    )

                    if athlete_result.data:
                        resolved_athlete_id = athlete_result.data[0]["id"]
                    else:
                        # Auto-create athlete
                        new_athlete = (
                            client.table("athletes")
                            .insert({"name": athlete_name, "coach_id": str(current_user)})
                            .execute()
                        )
                        resolved_athlete_id = new_athlete.data[0]["id"]

                    athlete_cache[athlete_name] = resolved_athlete_id

            if resolved_athlete_id:
                event_data = {
                    "athlete_id": resolved_athlete_id,
                    "event_date": event["event_date"],
                    "metrics": event["metrics"],
                }
                client.table("performance_events").insert(event_data).execute()
                processed_count += 1
            else:
                errors.append({
                    "row": 0,
                    "reason": "No athlete ID or name for event",
                })

        except Exception as e:
            errors.append({
                "row": 0,
                "reason": f"Database error: {str(e)}",
            })

    return CSVUploadResult(
        processed=processed_count,
        errors=errors,
        athlete_id=str(athlete_id) if athlete_id else None,
    )


@router.post("/csv/preview", status_code=status.HTTP_200_OK)
async def preview_csv(
    file: UploadFile = File(..., description="CSV file to preview"),
    current_user: UUID = Depends(get_current_user),
):
    """
    Preview CSV file without storing data.

    Returns parsed events and any validation warnings/errors.
    Useful for validating data before actual upload.
    """
    # Validate file type
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file",
        )

    # Read file content
    try:
        content = await file.read()
        csv_content = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be UTF-8 encoded",
        )

    # Validate and process
    ingestion_service = CSVIngestionService()
    warnings = ingestion_service.validate_csv_structure(csv_content)
    events, errors = ingestion_service.process_csv(csv_content)

    return {
        "warnings": warnings,
        "events_preview": events[:10],  # Return first 10 events as preview
        "total_events": len(events),
        "errors": errors,
    }
