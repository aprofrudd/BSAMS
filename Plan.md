Project: Boxing Science Athlete Management System (BSAMS)
Role: You are a Senior Backend Architect and UI Developer building a commercial-grade SaaS. Focus: Phase 1 (MVP) - Countermovement Jump (CMJ) Analysis Module. Context: We are building a High-Performance Athlete Management System (AMS). It must be hosted online as a paid application, so code quality, security, and scalability are paramount.

Global Technical Guidelines:

Tech Stack: Next.js (Frontend), Python FastAPI (Backend), Supabase (PostgreSQL Database & Auth).

Code Quality: All code must be modular, strictly typed (TypeScript/Pydantic), and fully documented.

Testing: Every core function (especially statistical calculations) must have accompanying pytest unit tests.

Security: Implement Row Level Security (RLS) policies immediately. Data security is top priority.

Scalability: The system must be "Metric Agnostic." Adding new tests (e.g., Squat Jump) should not require database migrations.

Design System & Branding:

Dominant Backgrounds: #090A3D (Primary), #07083D (Secondary/Card Backgrounds).

Primary Accent/Action: #33CBF4 (Cyan - Use for Buttons, Active States, Key Data Points).

Secondary Accents: #2074AA (Medium Blue), #2D5585 (Muted Blue - Use for borders or inactive elements).

UI Style: Dark Mode default (due to the deep navy dominant colors). High contrast white text for readability.

Phase 1: Architecture & Data Core (Supabase + FastAPI)
Goal: Establish a secure, multi-tenant database schema and backend structure that supports dynamic metric ingestion without login UI overhead.

1. Database Schema (Supabase SQL)

Approach: Use an Event-Based Schema (Normalized) rather than flat columns.

Tables:

users: Managed by Supabase Auth. Create a public profiles table linking id to role (Coach/Admin).

athletes: Columns include id (UUID), coach_id (FK to auth.users), full_name, dob, gender (Enum: Male, Female).

performance_events: The core table.

Columns: id, athlete_id (FK), date (Date), body_mass_kg (Float).

Crucial Requirement: Use a JSONB column named metrics to store test results.

Example: {"test_type": "CMJ", "height_cm": 45.5, "rsi_flight_time_ms": 200}.

Add a GIN index on metrics for fast querying.

Security: Enable RLS. Create a policy where users can only Select/Insert athletes where coach_id matches auth.uid().

2. Backend Setup (FastAPI)

Structure:

/app/routers: Endpoints for athletes, uploads, analysis.

/app/services: Pure business logic (Statistics, Z-Score math).

/app/schemas: Pydantic models for strict validation.

/app/core: Configuration and Supabase Client setup.

Auth Bypass (Dev Mode): Create a dependency get_current_user that currently returns a hardcoded UUID (provided later) to bypass Login UI development while ensuring all backend logic relies on user_id filtering from Day 1.

Phase 2: Backend Logic, Ingestion & Statistical Engine
Goal: The API can accept raw data files, normalize them, and return dynamic Z-scores on demand.

1. Ingestion Engine (Data Logic)

Create a service ingest_csv_data that:

Accepts the raw text/CSV.

Strictly parses dates as DD/MM/YYYY (Day First) to prevent US-centric parsing errors.

Maps raw columns to the JSONB structure (e.g., "CMJ Height (cm)" -> metrics: {"test_type": "CMJ", "height_cm": value}).

Includes error handling for "bad rows" (non-numeric values) without crashing the upload.

2. Statistical Engine (Math Logic)

Create a class StatEngine that separates math from the database.

Dynamic Calculation: Do not store Z-scores. Calculate them on-the-read.

Benchmarks: Implement logic to calculate Mean, Mode, SD, and 95% CI on filtered subsets (Whole Cohort vs. Gender vs. Mass Band).

Mass Banding: Create a function that bins body mass into 5kg increments (e.g., 70-74.9kg) at the time of calculation.

Z-Score Service: Implement calculate_z_score(value, population_mean, population_sd).

Requirement: Handle division by zero.

Requirement: Standardize output precision (2 decimal places).

3. Testing (Critical)

Write pytest cases for the StatEngine.

Test edge cases (e.g., athlete mass outside known bands, SD = 0).

Phase 3: Frontend - Dashboard & Visualization (Next.js)
Goal: An interactive dashboard where coaches can view progress and benchmark athletes.

1. Athlete Selector:

Sidebar or Search component to select an athlete (fetches from athletes table).

2. Data View Controls:

Variable Dropdown: Locked to "CMJ Height" for Phase 1 (but built to read from the JSON keys later).

Reference Group Dropdown: Options: "Whole Cohort", "Gender Specific", "Mass Band (5kg)".

View Toggle: Table vs. Graph.

3. Visualization (Graph):

Implement a Line Chart (Recharts/Chart.js).

Styling: Use the project color palette. The main data line should use the Accent Color (#33CBF4).

X-Axis: Test Date.

Y-Axis: CMJ Height.

Benchmarks: Dynamically fetch the benchmark stats for the selected Reference Group and plot them as overlays (e.g., a shaded area using a transparent version of #2D5585).

4. Table Component:

Columns: Date, Body Mass, Result (CMJ Height), Calculated Z-Score.

The Z-Score in this table must update dynamically if the user changes the "Reference Group" dropdown.

Phase 4: QA, Polish & Deployment Prep
Goal: Production readiness.

1. Integration Testing:

Test flow: Upload Data -> Select Athlete -> Switch Reference Group -> Verify Graph updates.

2. UI/UX Polish:

Ensure mobile responsiveness (iPad priority).

Add loading states (spinners using Accent #33CBF4) for all async data fetching.

3. Deployment Configuration:

Backend: Prepare a requirements.txt and a Procfile (or start.sh) suitable for deployment on platforms like Railway/Render.

Frontend: Ensure the Next.js build script is configured for Vercel deployment.

CI/CD: Set up a GitHub Actions workflow to run the pytest suite automatically on every push to the main branch.