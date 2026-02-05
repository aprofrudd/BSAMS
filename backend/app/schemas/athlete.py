"""Athlete schemas."""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.enums import Gender


class AthleteBase(BaseModel):
    """Base athlete schema with shared fields."""

    name: str = Field(..., min_length=1, max_length=255)
    gender: Gender
    date_of_birth: Optional[date] = None


class AthleteCreate(AthleteBase):
    """Schema for creating a new athlete."""

    pass


class AthleteUpdate(BaseModel):
    """Schema for updating an athlete."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    gender: Optional[Gender] = None
    date_of_birth: Optional[date] = None


class AthleteResponse(AthleteBase):
    """Schema for athlete responses."""

    id: UUID
    coach_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
