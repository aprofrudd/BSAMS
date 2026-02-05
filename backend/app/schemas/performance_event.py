"""Performance event schemas."""

from datetime import date, datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PerformanceEventBase(BaseModel):
    """Base performance event schema."""

    event_date: date
    metrics: Dict[str, Any] = Field(
        ...,
        description="JSONB metrics data (e.g., {'test_type': 'CMJ', 'height_cm': 45.5})",
    )


class PerformanceEventCreate(PerformanceEventBase):
    """Schema for creating a new performance event."""

    athlete_id: UUID


class PerformanceEventUpdate(BaseModel):
    """Schema for updating a performance event."""

    event_date: Optional[date] = None
    metrics: Optional[Dict[str, Any]] = None


class PerformanceEventResponse(PerformanceEventBase):
    """Schema for performance event responses."""

    id: UUID
    athlete_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
