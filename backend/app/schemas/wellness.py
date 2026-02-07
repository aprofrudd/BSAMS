"""Wellness entry schemas."""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class WellnessEntryCreate(BaseModel):
    """Schema for creating a new wellness entry."""

    athlete_id: UUID
    entry_date: date
    sleep_quality: int = Field(..., ge=1, le=5)
    fatigue: int = Field(..., ge=1, le=5)
    soreness: int = Field(..., ge=1, le=5)
    stress: int = Field(..., ge=1, le=5)
    mood: int = Field(..., ge=1, le=5)
    notes: Optional[str] = Field(None, max_length=1000)


class WellnessEntryUpdate(BaseModel):
    """Schema for updating a wellness entry."""

    entry_date: Optional[date] = None
    sleep_quality: Optional[int] = Field(None, ge=1, le=5)
    fatigue: Optional[int] = Field(None, ge=1, le=5)
    soreness: Optional[int] = Field(None, ge=1, le=5)
    stress: Optional[int] = Field(None, ge=1, le=5)
    mood: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = Field(None, max_length=1000)


class WellnessEntryResponse(BaseModel):
    """Schema for wellness entry responses."""

    id: UUID
    athlete_id: UUID
    entry_date: date
    sleep_quality: int
    fatigue: int
    soreness: int
    stress: int
    mood: int
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
