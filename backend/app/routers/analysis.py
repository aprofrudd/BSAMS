"""Analysis API router for benchmarks and Z-score calculations."""

from enum import Enum
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.security import get_current_user
from app.core.supabase_client import get_supabase_client
from app.schemas.enums import Gender
from app.services.stat_engine import StatEngine

router = APIRouter(prefix="/analysis", tags=["analysis"])


class ReferenceGroup(str, Enum):
    """Reference group options for benchmark calculations."""

    COHORT = "cohort"  # Whole cohort
    GENDER = "gender"  # Gender-specific
    MASS_BAND = "mass_band"  # Mass band specific


class BenchmarkResponse(BaseModel):
    """Response for benchmark statistics."""

    mean: Optional[float] = None
    std_dev: Optional[float] = None
    mode: Optional[float] = None
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None
    count: int = 0
    reference_group: str
    metric: str


class ZScoreResponse(BaseModel):
    """Response for Z-score calculation."""

    value: float
    z_score: float
    mean: float
    std_dev: float
    reference_group: str
    metric: str


@router.get("/benchmarks", response_model=BenchmarkResponse)
async def get_benchmarks(
    metric: str = Query(..., description="Metric key to analyze (e.g., 'height_cm')"),
    reference_group: ReferenceGroup = Query(
        ReferenceGroup.COHORT, description="Reference group for comparison"
    ),
    gender: Optional[Gender] = Query(None, description="Gender filter (required if reference_group=gender)"),
    mass_band: Optional[str] = Query(None, description="Mass band filter (e.g., '70-74.9kg')"),
    current_user: UUID = Depends(get_current_user),
):
    """
    Get benchmark statistics for a metric within a reference group.

    The reference group determines how athletes are grouped for comparison:
    - cohort: All athletes belonging to the coach
    - gender: Only athletes of the specified gender
    - mass_band: Only athletes within the specified 5kg mass band
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Validate parameters
    if reference_group == ReferenceGroup.GENDER and not gender:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gender parameter required when reference_group=gender",
        )

    if reference_group == ReferenceGroup.MASS_BAND and not mass_band:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mass band parameter required when reference_group=mass_band",
        )

    # Get all athletes for this coach
    athletes_result = (
        client.table("athletes")
        .select("id, gender")
        .eq("coach_id", str(current_user))
        .execute()
    )

    if not athletes_result.data:
        return BenchmarkResponse(
            count=0,
            reference_group=reference_group.value,
            metric=metric,
        )

    # Filter athletes by reference group
    athlete_ids = []
    for athlete in athletes_result.data:
        if reference_group == ReferenceGroup.GENDER:
            if athlete["gender"] == gender.value:
                athlete_ids.append(athlete["id"])
        else:
            athlete_ids.append(athlete["id"])

    if not athlete_ids:
        return BenchmarkResponse(
            count=0,
            reference_group=reference_group.value,
            metric=metric,
        )

    # Get performance events for these athletes
    events_result = (
        client.table("performance_events")
        .select("metrics")
        .in_("athlete_id", athlete_ids)
        .execute()
    )

    if not events_result.data:
        return BenchmarkResponse(
            count=0,
            reference_group=reference_group.value,
            metric=metric,
        )

    # Extract metric values
    values = []
    for event in events_result.data:
        metrics = event.get("metrics", {})

        # Filter by mass band if needed
        if reference_group == ReferenceGroup.MASS_BAND:
            body_mass = metrics.get("body_mass_kg")
            if body_mass is None:
                continue
            if StatEngine.get_mass_band(body_mass) != mass_band:
                continue

        # Extract the requested metric
        if metric in metrics:
            try:
                value = float(metrics[metric])
                values.append(value)
            except (TypeError, ValueError):
                continue

    if not values:
        return BenchmarkResponse(
            count=0,
            reference_group=reference_group.value,
            metric=metric,
        )

    # Calculate benchmarks
    benchmarks = StatEngine.calculate_benchmarks(values)

    return BenchmarkResponse(
        mean=benchmarks["mean"],
        std_dev=benchmarks["std_dev"],
        mode=benchmarks["mode"],
        ci_lower=benchmarks["ci_lower"],
        ci_upper=benchmarks["ci_upper"],
        count=benchmarks["count"],
        reference_group=reference_group.value,
        metric=metric,
    )


@router.get("/athlete/{athlete_id}/zscore", response_model=ZScoreResponse)
async def get_athlete_zscore(
    athlete_id: UUID,
    metric: str = Query(..., description="Metric key to analyze (e.g., 'height_cm')"),
    event_id: Optional[UUID] = Query(None, description="Specific event ID. If not provided, uses latest event."),
    reference_group: ReferenceGroup = Query(
        ReferenceGroup.COHORT, description="Reference group for comparison"
    ),
    current_user: UUID = Depends(get_current_user),
):
    """
    Calculate the Z-score for an athlete's metric value.

    The Z-score indicates how many standard deviations the athlete's
    value is from the reference group mean.
    """
    client = get_supabase_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Verify athlete belongs to coach and get their gender
    athlete_result = (
        client.table("athletes")
        .select("id, gender")
        .eq("id", str(athlete_id))
        .eq("coach_id", str(current_user))
        .execute()
    )

    if not athlete_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Athlete not found",
        )

    athlete = athlete_result.data[0]
    athlete_gender = athlete["gender"]

    # Get the specific event or latest event
    if event_id:
        event_result = (
            client.table("performance_events")
            .select("metrics")
            .eq("id", str(event_id))
            .eq("athlete_id", str(athlete_id))
            .execute()
        )
    else:
        event_result = (
            client.table("performance_events")
            .select("metrics")
            .eq("athlete_id", str(athlete_id))
            .order("event_date", desc=True)
            .limit(1)
            .execute()
        )

    if not event_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No events found for athlete",
        )

    event_metrics = event_result.data[0]["metrics"]

    # Get the athlete's value for this metric
    if metric not in event_metrics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Metric '{metric}' not found in event",
        )

    athlete_value = float(event_metrics[metric])

    # Get body mass for mass band filtering
    athlete_mass = event_metrics.get("body_mass_kg")

    # Determine reference group parameters
    gender_filter = None
    mass_band_filter = None

    if reference_group == ReferenceGroup.GENDER:
        gender_filter = Gender(athlete_gender)
    elif reference_group == ReferenceGroup.MASS_BAND:
        if athlete_mass is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Body mass required for mass band reference group",
            )
        mass_band_filter = StatEngine.get_mass_band(athlete_mass)

    # Get benchmarks for the reference group
    # Build query for all athletes
    athletes_query = (
        client.table("athletes")
        .select("id")
        .eq("coach_id", str(current_user))
    )

    if gender_filter:
        athletes_query = athletes_query.eq("gender", gender_filter.value)

    athletes_result = athletes_query.execute()

    if not athletes_result.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No athletes in reference group",
        )

    athlete_ids = [a["id"] for a in athletes_result.data]

    # Get all events for reference group
    events_result = (
        client.table("performance_events")
        .select("metrics")
        .in_("athlete_id", athlete_ids)
        .execute()
    )

    # Extract values for the metric
    values = []
    for event in events_result.data:
        metrics = event.get("metrics", {})

        # Filter by mass band if needed
        if mass_band_filter:
            event_mass = metrics.get("body_mass_kg")
            if event_mass is None:
                continue
            if StatEngine.get_mass_band(event_mass) != mass_band_filter:
                continue

        if metric in metrics:
            try:
                values.append(float(metrics[metric]))
            except (TypeError, ValueError):
                continue

    if not values:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data in reference group for this metric",
        )

    # Calculate statistics
    mean = StatEngine.calculate_mean(values)
    std_dev = StatEngine.calculate_std_dev(values)

    if mean is None or std_dev is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient data to calculate Z-score",
        )

    z_score = StatEngine.calculate_z_score(athlete_value, mean, std_dev)

    ref_group_label = reference_group.value
    if mass_band_filter:
        ref_group_label = f"mass_band:{mass_band_filter}"
    elif gender_filter:
        ref_group_label = f"gender:{gender_filter.value}"

    return ZScoreResponse(
        value=round(athlete_value, 2),
        z_score=z_score,
        mean=mean,
        std_dev=std_dev,
        reference_group=ref_group_label,
        metric=metric,
    )
