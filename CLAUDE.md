# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Boxing Science Athlete Management System (BSAMS) - A commercial SaaS for high-performance athlete management. Supports CMJ, SJ, EUR, and RSI analysis. Multi-tenant: external coaches manage own athletes, benchmark against Boxing Science data, and optionally share anonymised data.

**Status:** All 4 phases complete + Security hardened + Multi-metric dashboard + Inline CRUD + Multi-tenant + Production hardened (Tier 1-3) - Production deployed

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
pytest -v                                 # Run all tests (254)
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
- RLS policies on tables (backend bypasses via service_role key)
- `profiles` table required (FK from `athletes.coach_id`), auto-created on signup/login
- `coach_consents` table tracks data sharing opt-in per coach

### Auth & Roles
- JWT in HttpOnly/Secure/SameSite=Lax cookies (NOT localStorage)
- **Auth response returns only `user_id` and `email`** — no `access_token` in response body (token only in HttpOnly cookie)
- `AuthenticatedUser` dataclass: `id: UUID`, `role: str` ("admin" or "coach")
- `get_current_user()` returns `AuthenticatedUser` (not UUID)
- All routers use `current_user.id` for queries, `current_user.role` for access control
- `/auth/me` returns `{user_id, role}` — frontend fetches role after login
- **401 interceptor:** Frontend `fetchApi` detects 401 on non-auth endpoints, fires `onAuthError` event to clear user state and redirect to login
- Auto-profile creation: `_ensure_profile_exists()` runs on signup AND login (select+insert, never upsert to avoid overwriting admin roles)
- Tests use `app.dependency_overrides[get_current_user]`, conftest has `admin_client` fixture

### Backend Structure
```
backend/app/
├── routers/     # API endpoints (auth, athletes, events, uploads, analysis, consent, admin)
├── services/    # Business logic (csv_ingestion, stat_engine, benchmarks, admin_pool)
├── schemas/     # Pydantic models (athlete, event, auth, upload, enums, consent)
└── core/        # Config, Supabase client, security (JWT validation)
```

### Key Services
- **StatEngine:** Z-score calculation, benchmarks (Mean, Mode, SD, 95% CI)
- **Ingestion:** CSV parsing with DD/MM/YYYY date format, BOM handling, First Name + Surname support, auto-creates athletes on upload
- **Mass Banding:** 5kg increments calculated at query time (e.g., 70-74.9kg)
- **AdminPool:** `get_admin_athletes(client)` queries profiles for role='admin', returns their athletes for Boxing Science benchmark pool

### Multi-Tenant System
- **Roles:** admin (Boxing Science) and coach (external). Default role on signup: "coach"
- **Benchmark Source:** `BenchmarkSource` enum (`own` | `boxing_science`). Analysis endpoints accept `benchmark_source` query param. Coaches default to `boxing_science`, admins to `own`
- **Data Sharing Consent:** `coach_consents` table, `GET/PUT /consent/` endpoints, DataSharingConsent card in sidebar (coaches only)
- **Admin Shared Data:** `GET /admin/shared-athletes` (anonymised, excludes admin accounts), `GET /admin/shared-athletes/{id}/events`. Admin tab toggle in frontend ("My Athletes" / "Shared Data")
- **Manual Athlete Add:** AthleteCreateModal.tsx, "+ Add Athlete" button in AthleteSelector

### CSV Column Defaults
- Date: `Test Date`
- Name: `First Name` + `Surname` (or single `Athlete` column)
- Gender: `Gender` (male/female)
- Mass: `Body Mass (kg)`
- Metrics: `CMJ Height (cm)`, `SJ Height (cm)`, `EUR (cm)`, `RSI`, `RSI Flight (ms)`, `RSI Contact (ms)`

### Metric Key -> Display Label Mapping
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
├── components/  # AppHeader, AthleteCreateModal, AthleteEditModal, AthleteSelector, CsvPreviewTable, DataSharingConsent, DataViewControls, EventFormModal, MetricSelector, MetricBarChart, PerformanceGraph, PerformanceTable, SharedDataView, ZScoreRadar
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
7. **Rate limiting:** slowapi middleware (5/min auth, 10/min uploads, 30/min admin, 60/min general)
8. **CSV limits:** 10MB file size, 10,000 row maximum
9. **Batch inserts:** CSV events inserted in single bulk operation with individual fallback
10. **Multi-metric dashboard:** MetricSelector reads available metrics dynamically from backend, refreshes via `dataVersion` counter after data mutations
11. **Benchmarks for all reference groups:** PerformanceGraph passes athlete gender and computed mass band to benchmarks API
12. **Split event/benchmark loading:** Events reload on athlete/metric change; benchmarks reload on reference group change; date toggles persist across reference group switches
13. **On-demand radar:** ZScoreRadar only mounts when user clicks "Generate Radar Plot"
14. **Inline CRUD:** Add/edit/delete events via modal from PerformanceTable; edit athlete profile (name/gender/DOB) from AthleteSelector
15. **Auto-calculated metrics:** EUR = CMJ Height - SJ Height; RSI = Flight Time / Contact Time (computed on save, not manual input)
16. **Radar date selection:** ZScoreRadar fetches all events, date dropdown selects primary event, composite metric picker fills missing metrics from other dates
17. **Radar zone bands:** 4 background Radar elements with colored fills (green/cyan/yellow/red) at Z=3/1/0/-1 for visual zones
18. **Radar dot colors:** Dots color-coded by Z-score (green>=1, cyan>=0, yellow>=-1, red<-1) with white stroke ring; dashed ring on override-sourced dots
19. **Service role key:** Backend MUST use Supabase service_role key (not anon) to bypass RLS for server-side queries
20. **Auto-profile creation:** Profiles created on signup/login via select+insert (never upsert, to avoid overwriting admin roles)
21. **Admin data filtering:** Shared data view filters consents in Python (not DB) and excludes admin accounts from results
22. **Metrics validation on input only:** `validate_metrics()` checks allowed keys, numeric types, and ranges on `PerformanceEventCreate`/`Update` — NOT on `Response` (DB may contain legacy keys)
23. **Error sanitization:** Global exception handler returns generic 500 in production, detailed errors in development. `ENVIRONMENT` config var controls behavior.
24. **Request logging:** Middleware logs method, path, status code, and duration (ms) for every request. `LOG_LEVEL` config var controls verbosity.
25. **DB health check:** `/health` endpoint pings Supabase with a simple query, returns 503 if unreachable
26. **Sync endpoints:** All non-auth router endpoints use `def` (not `async def`) so FastAPI runs them in threadpool — avoids blocking event loop with sync Supabase client. Auth endpoints kept `async` for rate limiter compatibility.
27. **Multi-worker:** Procfile uses `--workers ${WEB_CONCURRENCY:-2}` for concurrent request handling
28. **Focus trapping:** All modals use `useFocusTrap` hook for accessibility (Tab/Shift+Tab cycling, Escape to close, focus restore)
29. **Pinned dependencies:** `requirements.txt` uses exact versions (e.g., `fastapi==0.128.2`) to prevent breaking changes
30. **Admin N+1 fix:** Shared athletes endpoint uses single `.in_()` query instead of per-coach `.eq()` loop

## API Endpoints

- `/health` - Health check (pings DB, returns 503 if unreachable)
- `/api/v1/auth/signup` - User signup (sets HttpOnly cookie, auto-creates profile)
- `/api/v1/auth/login` - User login (sets HttpOnly cookie, ensures profile exists)
- `/api/v1/auth/logout` - User logout (clears cookie)
- `/api/v1/auth/me` - Current user info (returns user_id and role)
- `/api/v1/athletes/` - CRUD with pagination (skip/limit), PATCH for profile updates
- `/api/v1/events/` - CRUD with pagination (skip/limit), PATCH for event updates
- `/api/v1/uploads/csv` - CSV upload (batch insert, auto-creates athletes)
- `/api/v1/uploads/csv/preview` - CSV preview without saving
- `/api/v1/analysis/benchmarks` - Statistics for any metric (accepts benchmark_source)
- `/api/v1/analysis/athlete/{id}/zscore` - Z-score for single event (accepts benchmark_source)
- `/api/v1/analysis/athlete/{id}/zscores` - Bulk Z-scores for all events (accepts benchmark_source)
- `/api/v1/analysis/athlete/{id}/metrics` - Available metric keys
- `/api/v1/consent/` - GET/PUT data sharing consent (coaches only)
- `/api/v1/admin/shared-athletes` - Anonymised athletes from opted-in coaches (admin only)
- `/api/v1/admin/shared-athletes/{id}/events` - Events for shared athlete (admin only)

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
- Tests are located in `backend/tests/` (254 total)
- Tests use dependency override in conftest.py (not DEV_MODE)
- All statistical calculations require pytest unit tests
- Test edge cases: SD=0, division by zero, mass outside known bands
- Integration test: Upload CSV -> Select Athlete -> Change Metric -> Change Reference Group -> Verify graph updates
- Test CSV fixtures use `Test Date` as default date column (not `Date`)

## Deployment

- **Backend:** Railway (https://bsams-production.up.railway.app)
- **Frontend:** Vercel (https://frontend-two-alpha-72.vercel.app)
- **CI/CD:** GitHub Actions runs pytest on push to main
- **Vercel env:** `NEXT_PUBLIC_API_URL` must be set cleanly (no trailing `\n`)
- **Railway env:** `FRONTEND_URL` must be set for CORS, `COOKIE_SECURE=true` for HttpOnly cookies, `SUPABASE_KEY` must be the **service_role (secret)** key (not anon), `ENVIRONMENT` (default "production"), `LOG_LEVEL` (default "INFO"), `WEB_CONCURRENCY` (default 2, number of uvicorn workers)
- **Supabase:** Profiles auto-created on signup/login. Migrations `004_add_indexes.sql` and `005_create_coach_consents_table.sql` must be run on Supabase SQL editor. RLS INSERT policy on profiles table required.
