"""Upload-related schemas."""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class RowError(BaseModel):
    """Error information for a failed row."""

    row: int = Field(..., description="Row number (1-indexed)")
    reason: str = Field(..., description="Error description")


class CSVUploadResult(BaseModel):
    """Result of CSV upload processing."""

    processed: int = Field(..., description="Number of successfully processed rows")
    errors: List[RowError] = Field(default_factory=list, description="List of row errors")
    athlete_id: Optional[str] = Field(None, description="Athlete ID if single athlete upload")


class CSVColumnMapping(BaseModel):
    """Mapping configuration for CSV columns."""

    date_column: str = Field(default="Test Date", description="Column name for test date")
    mass_column: str = Field(default="Body Mass (kg)", description="Column name for body mass")
    athlete_column: Optional[str] = Field(default="Athlete", description="Column name for athlete name")
    first_name_column: Optional[str] = Field(default="First Name", description="Column for first name")
    surname_column: Optional[str] = Field(default="Surname", description="Column for surname")

    # Metric mappings: CSV column name -> (test_type, metric_key)
    metric_columns: Dict[str, Dict[str, str]] = Field(
        default_factory=lambda: {
            "CMJ Height (cm)": {"test_type": "CMJ", "metric_key": "height_cm"},
            "SJ Height (cm)": {"test_type": "SJ", "metric_key": "sj_height_cm"},
            "EUR (cm)": {"test_type": "CMJ", "metric_key": "eur_cm"},
            "RSI": {"test_type": "CMJ", "metric_key": "rsi"},
            "RSI Flight (ms)": {"test_type": "CMJ", "metric_key": "flight_time_ms"},
            "RSI Contact (ms)": {"test_type": "CMJ", "metric_key": "contraction_time_ms"},
            "CMJ RSI": {"test_type": "CMJ", "metric_key": "rsi"},
            "CMJ Flight Time (ms)": {"test_type": "CMJ", "metric_key": "flight_time_ms"},
            "CMJ Contraction Time (ms)": {"test_type": "CMJ", "metric_key": "contraction_time_ms"},
        },
        description="Mapping of CSV columns to metric structure",
    )
