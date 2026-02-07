"""Training session schemas."""

from datetime import date, datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


ALLOWED_TRAINING_TYPES = [
    "Strength",
    "Boxing",
    "Conditioning",
    "Plyometric",
    "Recovery",
    "Sparring",
    "Pads",
    "Technical",
    "Other",
]


class TrainingSessionCreate(BaseModel):
    """Schema for creating a new training session."""

    athlete_id: UUID
    session_date: date
    training_type: str = Field(..., max_length=50)
    duration_minutes: int = Field(..., ge=1, le=600)
    rpe: int = Field(..., ge=1, le=10)
    notes: Optional[str] = Field(None, max_length=1000)
    metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Optional JSONB metrics (e.g., jump readiness data)",
    )

    @field_validator("training_type")
    @classmethod
    def validate_training_type(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("training_type cannot be empty")
        return v.strip()


class TrainingSessionUpdate(BaseModel):
    """Schema for updating a training session."""

    session_date: Optional[date] = None
    training_type: Optional[str] = Field(None, max_length=50)
    duration_minutes: Optional[int] = Field(None, ge=1, le=600)
    rpe: Optional[int] = Field(None, ge=1, le=10)
    notes: Optional[str] = Field(None, max_length=1000)
    metrics: Optional[Dict[str, Any]] = None

    @field_validator("training_type")
    @classmethod
    def validate_training_type(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("training_type cannot be empty")
        return v.strip() if v is not None else v


class TrainingSessionResponse(BaseModel):
    """Schema for training session responses."""

    id: UUID
    athlete_id: UUID
    session_date: date
    training_type: str
    duration_minutes: int
    rpe: int
    srpe: int
    notes: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
