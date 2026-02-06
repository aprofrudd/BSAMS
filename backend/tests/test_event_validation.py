"""Tests for event metrics JSONB validation."""

import pytest
from pydantic import ValidationError

from app.schemas.performance_event import PerformanceEventCreate, PerformanceEventUpdate


class TestMetricsValidation:
    """Test metrics dict validation on PerformanceEventCreate."""

    def test_valid_metrics_accepted(self):
        """Should accept valid metric keys with numeric values."""
        event = PerformanceEventCreate(
            athlete_id="00000000-0000-0000-0000-000000000001",
            event_date="2024-01-01",
            metrics={"height_cm": 45.5, "body_mass_kg": 72.0, "test_type": "CMJ"},
        )
        assert event.metrics["height_cm"] == 45.5

    def test_unknown_key_rejected(self):
        """Should reject unknown metric keys."""
        with pytest.raises(ValidationError, match="Unknown metric key"):
            PerformanceEventCreate(
                athlete_id="00000000-0000-0000-0000-000000000001",
                event_date="2024-01-01",
                metrics={"height_cm": 45.5, "malicious_key": 999},
            )

    def test_non_numeric_value_rejected(self):
        """Should reject non-numeric values for numeric metrics."""
        with pytest.raises(ValidationError, match="must be a number"):
            PerformanceEventCreate(
                athlete_id="00000000-0000-0000-0000-000000000001",
                event_date="2024-01-01",
                metrics={"height_cm": "not_a_number"},
            )

    def test_value_below_minimum_rejected(self):
        """Should reject values below minimum range."""
        with pytest.raises(ValidationError, match="below minimum"):
            PerformanceEventCreate(
                athlete_id="00000000-0000-0000-0000-000000000001",
                event_date="2024-01-01",
                metrics={"height_cm": -5.0},
            )

    def test_value_above_maximum_rejected(self):
        """Should reject values above maximum range."""
        with pytest.raises(ValidationError, match="above maximum"):
            PerformanceEventCreate(
                athlete_id="00000000-0000-0000-0000-000000000001",
                event_date="2024-01-01",
                metrics={"height_cm": 999.0},
            )

    def test_test_type_string_accepted(self):
        """Should accept string value for test_type."""
        event = PerformanceEventCreate(
            athlete_id="00000000-0000-0000-0000-000000000001",
            event_date="2024-01-01",
            metrics={"test_type": "CMJ", "height_cm": 45.0},
        )
        assert event.metrics["test_type"] == "CMJ"

    def test_test_type_numeric_rejected(self):
        """Should reject numeric value for test_type."""
        with pytest.raises(ValidationError, match="test_type must be a string"):
            PerformanceEventCreate(
                athlete_id="00000000-0000-0000-0000-000000000001",
                event_date="2024-01-01",
                metrics={"test_type": 123},
            )

    def test_test_type_too_long_rejected(self):
        """Should reject test_type longer than 50 characters."""
        with pytest.raises(ValidationError, match="50 characters"):
            PerformanceEventCreate(
                athlete_id="00000000-0000-0000-0000-000000000001",
                event_date="2024-01-01",
                metrics={"test_type": "A" * 51},
            )

    def test_empty_metrics_accepted(self):
        """Should accept empty metrics dict."""
        event = PerformanceEventCreate(
            athlete_id="00000000-0000-0000-0000-000000000001",
            event_date="2024-01-01",
            metrics={},
        )
        assert event.metrics == {}

    def test_all_valid_keys_accepted(self):
        """Should accept all known metric keys with valid values."""
        event = PerformanceEventCreate(
            athlete_id="00000000-0000-0000-0000-000000000001",
            event_date="2024-01-01",
            metrics={
                "test_type": "CMJ",
                "body_mass_kg": 72.0,
                "height_cm": 45.5,
                "sj_height_cm": 35.0,
                "eur_cm": 10.5,
                "rsi": 2.21,
                "flight_time_ms": 450.0,
                "contraction_time_ms": 200.0,
            },
        )
        assert len(event.metrics) == 8

    def test_eur_negative_accepted(self):
        """Should accept negative EUR values (SJ > CMJ is physically possible)."""
        event = PerformanceEventCreate(
            athlete_id="00000000-0000-0000-0000-000000000001",
            event_date="2024-01-01",
            metrics={"eur_cm": -5.0},
        )
        assert event.metrics["eur_cm"] == -5.0

    def test_integer_values_accepted(self):
        """Should accept integer values for numeric metrics."""
        event = PerformanceEventCreate(
            athlete_id="00000000-0000-0000-0000-000000000001",
            event_date="2024-01-01",
            metrics={"height_cm": 45, "body_mass_kg": 72},
        )
        assert event.metrics["height_cm"] == 45


class TestUpdateMetricsValidation:
    """Test metrics validation on PerformanceEventUpdate."""

    def test_update_unknown_key_rejected(self):
        """Should reject unknown metric keys on update."""
        with pytest.raises(ValidationError, match="Unknown metric key"):
            PerformanceEventUpdate(
                metrics={"bad_key": 123},
            )

    def test_update_valid_metrics_accepted(self):
        """Should accept valid metrics on update."""
        update = PerformanceEventUpdate(
            metrics={"height_cm": 46.0},
        )
        assert update.metrics["height_cm"] == 46.0

    def test_update_none_metrics_accepted(self):
        """Should accept None metrics (no update)."""
        update = PerformanceEventUpdate(metrics=None)
        assert update.metrics is None
