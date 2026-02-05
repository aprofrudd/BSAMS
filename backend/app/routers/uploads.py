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

    for event in events:
        try:
            # If athlete_id was provided, use it
            if athlete_id:
                # Verify athlete belongs to coach
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

                # Insert event
                event_data = {
                    "athlete_id": str(athlete_id),
                    "event_date": event["event_date"],
                    "metrics": event["metrics"],
                }
                client.table("performance_events").insert(event_data).execute()
                processed_count += 1

            elif "athlete_name" in event:
                # Look up athlete by name for this coach
                athlete_name = event["athlete_name"]
                athlete_result = (
                    client.table("athletes")
                    .select("id")
                    .eq("coach_id", str(current_user))
                    .eq("name", athlete_name)
                    .execute()
                )

                if athlete_result.data:
                    event_data = {
                        "athlete_id": athlete_result.data[0]["id"],
                        "event_date": event["event_date"],
                        "metrics": event["metrics"],
                    }
                    client.table("performance_events").insert(event_data).execute()
                    processed_count += 1
                else:
                    # Athlete not found - add to errors
                    errors.append({
                        "row": 0,  # Unknown row at this point
                        "reason": f"Athlete not found: {athlete_name}",
                    })

        except Exception as e:
            # Log error but continue processing
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
