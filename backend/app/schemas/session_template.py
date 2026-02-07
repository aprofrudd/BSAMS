"""Session template schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class TemplateExerciseCreate(BaseModel):
    """Schema for creating a template exercise."""

    exercise_library_id: Optional[str] = None
    exercise_name: str = Field(..., max_length=100)
    exercise_category: Optional[str] = Field(None, max_length=50)
    order_index: int = Field(1, ge=1, le=50)
    sets: int = Field(1, ge=1, le=20)
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


class TemplateExerciseResponse(BaseModel):
    """Schema for template exercise responses."""

    id: UUID
    template_id: UUID
    exercise_library_id: Optional[UUID] = None
    exercise_name: str
    exercise_category: Optional[str] = None
    order_index: int
    sets: int
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


class SessionTemplateCreate(BaseModel):
    """Schema for creating a session template."""

    template_name: str = Field(..., max_length=100)
    training_type: str = Field(..., max_length=50)
    notes: Optional[str] = Field(None, max_length=1000)
    exercises: List[TemplateExerciseCreate] = []

    @field_validator("template_name")
    @classmethod
    def validate_template_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("template_name cannot be empty")
        return v.strip()


class SessionTemplateUpdate(BaseModel):
    """Schema for updating a session template."""

    template_name: Optional[str] = Field(None, max_length=100)
    training_type: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=1000)
    exercises: Optional[List[TemplateExerciseCreate]] = None


class SessionTemplateResponse(BaseModel):
    """Schema for session template responses."""

    id: UUID
    coach_id: UUID
    template_name: str
    training_type: str
    notes: Optional[str] = None
    exercises: List[TemplateExerciseResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
