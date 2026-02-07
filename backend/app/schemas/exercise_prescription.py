"""Exercise prescription schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ExercisePrescriptionCreate(BaseModel):
    """Schema for creating a new exercise prescription."""

    exercise_name: str = Field(..., max_length=100)
    exercise_category: Optional[str] = Field(None, max_length=50)
    set_number: int = Field(..., ge=1, le=20)
    reps: Optional[int] = Field(None, ge=1, le=100)
    weight_kg: Optional[float] = Field(None, ge=0, le=500)
    tempo: Optional[str] = Field(None, max_length=20)
    rest_seconds: Optional[int] = Field(None, ge=0, le=600)
    duration_seconds: Optional[int] = Field(None, ge=0, le=3600)
    distance_meters: Optional[float] = Field(None, ge=0, le=50000)
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("exercise_name")
    @classmethod
    def validate_exercise_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("exercise_name cannot be empty")
        return v.strip()


class ExercisePrescriptionUpdate(BaseModel):
    """Schema for updating an exercise prescription."""

    exercise_name: Optional[str] = Field(None, max_length=100)
    exercise_category: Optional[str] = Field(None, max_length=50)
    set_number: Optional[int] = Field(None, ge=1, le=20)
    reps: Optional[int] = Field(None, ge=1, le=100)
    weight_kg: Optional[float] = Field(None, ge=0, le=500)
    tempo: Optional[str] = Field(None, max_length=20)
    rest_seconds: Optional[int] = Field(None, ge=0, le=600)
    duration_seconds: Optional[int] = Field(None, ge=0, le=3600)
    distance_meters: Optional[float] = Field(None, ge=0, le=50000)
    notes: Optional[str] = Field(None, max_length=500)


class ExercisePrescriptionResponse(BaseModel):
    """Schema for exercise prescription responses."""

    id: UUID
    session_id: UUID
    exercise_name: str
    exercise_category: Optional[str] = None
    set_number: int
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    tempo: Optional[str] = None
    rest_seconds: Optional[int] = None
    duration_seconds: Optional[int] = None
    distance_meters: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
