"""Exercise library schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ExerciseLibraryCreate(BaseModel):
    """Schema for creating an exercise library entry."""

    exercise_name: str = Field(..., max_length=100)
    exercise_category: Optional[str] = Field(None, max_length=50)
    default_reps: Optional[int] = Field(None, ge=1, le=100)
    default_weight_kg: Optional[float] = Field(None, ge=0, le=500)
    default_tempo: Optional[str] = Field(None, max_length=20)
    default_rest_seconds: Optional[int] = Field(None, ge=0, le=600)
    default_duration_seconds: Optional[int] = Field(None, ge=0, le=3600)
    default_distance_meters: Optional[float] = Field(None, ge=0, le=50000)
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("exercise_name")
    @classmethod
    def validate_exercise_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("exercise_name cannot be empty")
        return v.strip()


class ExerciseLibraryUpdate(BaseModel):
    """Schema for updating an exercise library entry."""

    exercise_name: Optional[str] = Field(None, max_length=100)
    exercise_category: Optional[str] = Field(None, max_length=50)
    default_reps: Optional[int] = Field(None, ge=1, le=100)
    default_weight_kg: Optional[float] = Field(None, ge=0, le=500)
    default_tempo: Optional[str] = Field(None, max_length=20)
    default_rest_seconds: Optional[int] = Field(None, ge=0, le=600)
    default_duration_seconds: Optional[int] = Field(None, ge=0, le=3600)
    default_distance_meters: Optional[float] = Field(None, ge=0, le=50000)
    notes: Optional[str] = Field(None, max_length=500)


class ExerciseLibraryResponse(BaseModel):
    """Schema for exercise library responses."""

    id: UUID
    coach_id: UUID
    exercise_name: str
    exercise_category: Optional[str] = None
    default_reps: Optional[int] = None
    default_weight_kg: Optional[float] = None
    default_tempo: Optional[str] = None
    default_rest_seconds: Optional[int] = None
    default_duration_seconds: Optional[int] = None
    default_distance_meters: Optional[float] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
