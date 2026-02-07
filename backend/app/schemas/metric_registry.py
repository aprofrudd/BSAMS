"""Central metric registry — single source of truth for all metric definitions.

Used by:
- performance_event.py (validation)
- analysis.py (filtering non-metric keys)
- Frontend metricRegistry.ts mirrors this

Each metric definition includes:
- key: Database column/JSONB key
- label: Human-readable display label
- unit: Unit of measurement
- domain: Which section it belongs to (testing, training, wellness)
- range: (min, max) for validation (None = no numeric validation)
- higher_is_better: For Z-score coloring
"""

from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass
class MetricDefinition:
    key: str
    label: str
    unit: str
    domain: str  # "testing", "training", "wellness"
    range: Optional[Tuple[float, float]]  # (min, max), None for non-numeric
    higher_is_better: bool = True


# All metric definitions
METRIC_DEFINITIONS: list[MetricDefinition] = [
    # Testing metrics
    MetricDefinition("height_cm", "CMJ Height (cm)", "cm", "testing", (0, 200), True),
    MetricDefinition("sj_height_cm", "SJ Height (cm)", "cm", "testing", (0, 200), True),
    MetricDefinition("eur_cm", "Eccentric Utilisation Ratio (cm)", "cm", "testing", (-100, 200), True),
    MetricDefinition("rsi", "Reactive Strength Index", "", "testing", (0, 50), True),
    MetricDefinition("flight_time_ms", "Flight Time (ms)", "ms", "testing", (0, 2000), True),
    MetricDefinition("contraction_time_ms", "Contact Time (ms)", "ms", "testing", (0, 2000), False),
    # Metadata (not used in benchmarks)
    MetricDefinition("body_mass_kg", "Body Mass (kg)", "kg", "testing", (0, 500), False),
    MetricDefinition("test_type", "Test Type", "", "testing", None, False),
]

# Derived lookup dicts
METRIC_BY_KEY = {m.key: m for m in METRIC_DEFINITIONS}
TESTING_METRICS = [m for m in METRIC_DEFINITIONS if m.domain == "testing"]
NON_METRIC_KEYS = {"test_type", "body_mass_kg"}

# For backwards compatibility with performance_event.py validation
ALLOWED_METRIC_KEYS = {
    m.key: m.range if m.range else (None, None)
    for m in METRIC_DEFINITIONS
    if m.domain == "testing"
}

METRIC_LABELS = {m.key: m.label for m in METRIC_DEFINITIONS}
