# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Boxing Science Athlete Management System (BSAMS) - A commercial SaaS for high-performance athlete management. Phase 1 MVP focuses on Countermovement Jump (CMJ) analysis.

**Status:** All 4 phases complete - Production ready

## Tech Stack

- **Frontend:** Next.js with TypeScript
- **Backend:** Python FastAPI with Pydantic
- **Database:** Supabase (PostgreSQL with Row-Level Security)
- **Auth:** Supabase Auth

## Build & Run Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload  # Dev server
pytest -v                                 # Run all tests
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
- Example: `{"test_type": "CMJ", "height_cm": 45.5}`
- GIN index on metrics for fast querying
- RLS policies: users only access athletes where `coach_id = auth.uid()`

### Backend Structure
```
backend/app/
├── routers/     # API endpoints (auth, athletes, uploads, analysis)
├── services/    # Business logic (ingest_csv, stat_engine, benchmarks)
├── schemas/     # Pydantic models (athlete, event, auth, upload)
└── core/        # Config, Supabase client, security (JWT validation)
```

### Key Services
- **StatEngine:** Z-score calculation, benchmarks (Mean, Mode, SD, 95% CI)
- **Ingestion:** CSV parsing with DD/MM/YYYY date format, JSONB mapping
- **Mass Banding:** 5kg increments calculated at query time (e.g., 70-74.9kg)

### Frontend Structure
```
frontend/
├── app/         # Next.js pages (dashboard, login)
├── components/  # AppHeader, AthleteSelector, DataViewControls, PerformanceGraph, PerformanceTable
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
3. **Auth:** Supabase Auth with JWT validation. `DEV_MODE=true` bypasses JWT and returns hardcoded UUID for local development
4. **Date parsing:** Strictly DD/MM/YYYY format

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
- Tests are located in `backend/tests/`
- All statistical calculations require pytest unit tests
- Test edge cases: SD=0, division by zero, mass outside known bands
- Integration test: Upload CSV → Select Athlete → Change Reference Group → Verify graph updates

## Deployment

- **Backend:** Railway or Render
- **Frontend:** Vercel
- **CI/CD:** GitHub Actions runs pytest on push to main
