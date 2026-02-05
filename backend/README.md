# BSAMS Backend

Boxing Science Athlete Management System - FastAPI Backend

## Setup

### Prerequisites

- Python 3.10+
- Supabase account and project

### Installation

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. Run database migrations in Supabase SQL Editor (see `migrations/README.md`)

### Running the Server

Development server with hot reload:
```bash
python -m uvicorn app.main:app --reload
```

Production:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Documentation

Once the server is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## API Endpoints

### Health Check
- `GET /health` - Returns `{"status": "healthy"}`

### Athletes (requires authentication)
- `GET /api/v1/athletes/` - List all athletes
- `GET /api/v1/athletes/{id}` - Get single athlete
- `POST /api/v1/athletes/` - Create athlete
- `PATCH /api/v1/athletes/{id}` - Update athlete
- `DELETE /api/v1/athletes/{id}` - Delete athlete

### Performance Events (requires authentication)
- `GET /api/v1/events/athlete/{athlete_id}` - List events for athlete
- `GET /api/v1/events/{id}` - Get single event
- `POST /api/v1/events/` - Create event
- `PATCH /api/v1/events/{id}` - Update event
- `DELETE /api/v1/events/{id}` - Delete event

### CSV Upload (requires authentication)
- `POST /api/v1/uploads/csv` - Upload and process CSV file
- `POST /api/v1/uploads/csv/preview` - Preview CSV without saving

### Analysis (requires authentication)
- `GET /api/v1/analysis/benchmarks` - Get benchmark statistics
- `GET /api/v1/analysis/athlete/{id}/zscore` - Calculate Z-score for athlete

## Testing

Run all tests:
```bash
python -m pytest tests/ -v
```

Run with coverage:
```bash
python -m pytest tests/ -v --cov=app --cov-report=html
```

Run specific test file:
```bash
python -m pytest tests/test_athletes_router.py -v
```

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── core/
│   │   ├── config.py        # Settings and configuration
│   │   ├── security.py      # Authentication (dev bypass)
│   │   └── supabase_client.py
│   ├── routers/
│   │   ├── athletes.py      # Athlete endpoints
│   │   ├── events.py        # Event endpoints
│   │   ├── uploads.py       # CSV upload
│   │   └── analysis.py      # Benchmarks & Z-scores
│   ├── services/
│   │   ├── athlete_service.py
│   │   ├── event_service.py
│   │   ├── csv_ingestion.py # CSV parsing
│   │   └── stat_engine.py   # Statistics
│   └── schemas/
│       ├── enums.py         # Gender, UserRole
│       ├── athlete.py       # Athlete Pydantic models
│       ├── performance_event.py
│       └── upload.py        # CSV upload schemas
├── migrations/              # SQL migrations
├── tests/                   # Test suite (187 tests)
├── Procfile                 # Railway/Render deployment
├── start.sh                 # Alternative startup script
├── runtime.txt              # Python version
├── .env.example
└── requirements.txt
```

## Development Mode

In development mode, authentication is bypassed using a hardcoded user ID (`DEV_USER_ID` in `.env`). This allows testing without setting up full Supabase authentication.

## Data Model

### Athletes
- `id` (UUID) - Primary key
- `coach_id` (UUID) - Foreign key to profiles
- `name` (string) - Athlete name
- `gender` (enum) - 'male' or 'female'
- `date_of_birth` (date, optional)
- `created_at`, `updated_at` (timestamps)

### Performance Events
- `id` (UUID) - Primary key
- `athlete_id` (UUID) - Foreign key to athletes
- `event_date` (date) - Date of the performance test
- `metrics` (JSONB) - Flexible metrics storage
- `created_at`, `updated_at` (timestamps)

### Metrics JSONB Example
```json
{
  "test_type": "CMJ",
  "height_cm": 45.5,
  "mass_kg": 75.0,
  "flight_time_ms": 500
}
```
