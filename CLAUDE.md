# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Boxing Science Athlete Management System (BSAMS) - A commercial SaaS for high-performance athlete management. Supports CMJ, SJ, EUR, and RSI analysis.

**Status:** All 4 phases complete + Security hardened + Multi-metric dashboard - Production deployed

## Tech Stack

- **Frontend:** Next.js with TypeScript
- **Backend:** Python FastAPI with Pydantic
- **Database:** Supabase (PostgreSQL with Row-Level Security)
- **Auth:** Supabase Auth (JWT via HttpOnly cookies)

## Build & Run Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload  # Dev server
pytest -v                                 # Run all tests (201)
pytest tests/test_stat_engine.py -v      # Run specific test file
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # Dev server
npm run build    # Production build
npm test         # Run tests
```

## Architecture

### Database Schema (Event-Based)
- `performance_events` table uses JSONB `metrics` column for metric-agnostic storage
- Example: `{"test_type": "CMJ", "height_cm": 45.5, "sj_height_cm": 35.5, "rsi": 2.21}`
- GIN index on metrics for fast querying
- RLS policies: users only access athletes where `coach_id = auth.uid()`
- `profiles` table required (FK from `athletes.coach_id`)

### Backend Structure
```
backend/app/
├── routers/     # API endpoints (auth, athletes, events, uploads, analysis)
├── services/    # Business logic (csv_ingestion, stat_engine, benchmarks)
├── schemas/     # Pydantic models (athlete, event, auth, upload, enums)
└── core/        # Config, Supabase client, security (JWT validation)
```

### Key Services
- **StatEngine:** Z-score calculation, benchmarks (Mean, Mode, SD, 95% CI)
- **Ingestion:** CSV parsing with DD/MM/YYYY date format, BOM handling, First Name + Surname support, auto-creates athletes on upload
- **Mass Banding:** 5kg increments calculated at query time (e.g., 70-74.9kg)

### CSV Column Defaults
- Date: `Test Date`
- Name: `First Name` + `Surname` (or single `Athlete` column)
- Gender: `Gender` (male/female)
- Mass: `Body Mass (kg)`
- Metrics: `CMJ Height (cm)`, `SJ Height (cm)`, `EUR (cm)`, `RSI`, `RSI Flight (ms)`, `RSI Contact (ms)`

### Metric Key → Display Label Mapping
| DB Key | Display Label |
|--------|--------------|
| `height_cm` | CMJ Height (cm) |
| `sj_height_cm` | SJ Height (cm) |
| `eur_cm` | Eccentric Utilisation Ratio (cm) |
| `rsi` | Reactive Strength Index |
| `flight_time_ms` | Flight Time (ms) |
| `contraction_time_ms` | Contact Time (ms) |

### Frontend Structure
```
frontend/
├── app/         # Next.js pages (dashboard, login, upload)
├── components/  # AppHeader, AthleteSelector, CsvPreviewTable, DataViewControls, MetricSelector, MetricBarChart, PerformanceGraph, PerformanceTable, ZScoreRadar
└── lib/         # API client, auth context, hooks, utils
```

## Design System

| Purpose | Hex |
|---------|-----|
| Primary Background | #090A3D |
| Secondary Background | #07083D |
| Accent (buttons, active states) | #33CBF4 |
| Medium Blue | #2074AA |
| Muted Blue (borders, inactive) | #2D5585 |

Dark mode default with high-contrast white text. Mobile-first (iPad priority).

## Key Technical Decisions

1. **Dynamic Z-scores:** Calculate on-read, not stored in database
2. **Metric-agnostic design:** JSONB metrics column avoids schema migrations for new test types
3. **Auth:** Supabase Auth with JWT in HttpOnly cookies. Tests use dependency override (`app.dependency_overrides[get_current_user]`)
4. **Date parsing:** Strictly DD/MM/YYYY format
5. **Auto-create athletes:** CSV upload auto-creates athlete records when names not found in DB
6. **Trailing slash proxy:** `skipTrailingSlashRedirect: true` + regex rewrite in next.config.js to prevent Vercel/FastAPI redirect loops
7. **Rate limiting:** slowapi middleware (5/min auth, 10/min uploads, 60/min general)
8. **CSV limits:** 10MB file size, 10,000 row maximum
9. **Batch inserts:** CSV events inserted in single bulk operation with individual fallback
10. **Multi-metric dashboard:** MetricSelector reads available metrics dynamically from backend
11. **Benchmarks for all reference groups:** PerformanceGraph passes athlete gender and computed mass band to benchmarks API
12. **Split event/benchmark loading:** Events reload on athlete/metric change; benchmarks reload on reference group change; date toggles persist across reference group switches
13. **On-demand radar:** ZScoreRadar only mounts when user clicks "Generate Radar Plot"

## API Endpoints

- `/health` - Health check
- `/api/v1/auth/signup` - User signup (sets HttpOnly cookie)
- `/api/v1/auth/login` - User login (sets HttpOnly cookie)
- `/api/v1/auth/logout` - User logout (clears cookie)
- `/api/v1/auth/me` - Current user info
- `/api/v1/athletes/` - CRUD with pagination (skip/limit)
- `/api/v1/events/` - CRUD with pagination (skip/limit)
- `/api/v1/uploads/csv` - CSV upload (batch insert, auto-creates athletes)
- `/api/v1/uploads/csv/preview` - CSV preview without saving
- `/api/v1/analysis/benchmarks` - Statistics for any metric
- `/api/v1/analysis/athlete/{id}/zscore` - Z-score for single event
- `/api/v1/analysis/athlete/{id}/zscores` - Bulk Z-scores for all events
- `/api/v1/analysis/athlete/{id}/metrics` - Available metric keys

## Development Rules

### Bug Fixing Process
1. **Write a test first** that reproduces the bug
2. Verify the test fails
3. Implement the fix
4. Verify the test passes
5. Document in BUG_LOG.md

### Code Changes
- If changes require more than 3 files, break into smaller tasks
- List what could break after writing code
- Write tests to cover potential breakages

### Testing Requirements
- All bug fixes must have a corresponding test
- Run full test suite before committing: `python -m pytest tests/ -v`
- Tests are located in `backend/tests/` (201 total)
- Tests use dependency override in conftest.py (not DEV_MODE)
- All statistical calculations require pytest unit tests
- Test edge cases: SD=0, division by zero, mass outside known bands
- Integration test: Upload CSV → Select Athlete → Change Metric → Change Reference Group → Verify graph updates
- Test CSV fixtures use `Test Date` as default date column (not `Date`)

## Deployment

- **Backend:** Railway (https://bsams-production.up.railway.app)
- **Frontend:** Vercel (https://frontend-two-alpha-72.vercel.app)
- **CI/CD:** GitHub Actions runs pytest on push to main
- **Vercel env:** `NEXT_PUBLIC_API_URL` must be set cleanly (no trailing `\n`)
- **Railway env:** `FRONTEND_URL` must be set for CORS, `COOKIE_SECURE=true` for HttpOnly cookies
- **Supabase:** New users need a `profiles` row for the FK constraint
