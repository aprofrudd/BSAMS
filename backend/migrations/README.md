# Database Migrations

SQL migration scripts for Supabase.

## Running Migrations

1. Log into your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order:
   - `001_create_profiles_table.sql`
   - `002_create_athletes_table.sql`
   - `003_create_performance_events_table.sql`

## Migration Order

Migrations must be run in numerical order due to foreign key dependencies:

1. **001_create_profiles_table.sql**
   - Creates the `profiles` table (linked to Supabase Auth)
   - Sets up trigger for auto-profile creation on signup
   - Enables RLS with user-only access

2. **002_create_athletes_table.sql**
   - Creates the `athletes` table
   - Foreign key to `profiles.id`
   - RLS policies: coaches only access their own athletes

3. **003_create_performance_events_table.sql**
   - Creates the `performance_events` table
   - JSONB `metrics` column for flexible data storage
   - GIN index for fast JSONB queries
   - RLS policies via athlete ownership check

## Row Level Security (RLS)

All tables have RLS enabled. Policies ensure:

- **Profiles**: Users can only read/update their own profile
- **Athletes**: Coaches can only CRUD their own athletes (`coach_id = auth.uid()`)
- **Performance Events**: Access granted via athlete ownership chain

## Key Features

### JSONB Metrics Column

The `performance_events.metrics` column uses JSONB for flexible storage:

```sql
-- Example data
INSERT INTO performance_events (athlete_id, event_date, metrics)
VALUES (
  'athlete-uuid',
  '2024-01-15',
  '{"test_type": "CMJ", "height_cm": 45.5, "mass_kg": 75.0}'::jsonb
);

-- Query by metric
SELECT * FROM performance_events
WHERE metrics->>'test_type' = 'CMJ';

-- Query numeric values
SELECT * FROM performance_events
WHERE (metrics->>'height_cm')::numeric > 40;
```

### GIN Index

The GIN index on `metrics` enables fast querying:

```sql
-- This query uses the GIN index
SELECT * FROM performance_events
WHERE metrics @> '{"test_type": "CMJ"}'::jsonb;
```

## Verification

After running migrations, verify in Supabase Dashboard:

1. **Tables**: Check that `profiles`, `athletes`, `performance_events` exist
2. **RLS**: Verify RLS is enabled on all tables (shield icon)
3. **Policies**: Check policies in Authentication → Policies
4. **Indexes**: Verify indexes in Table Editor → Indexes

## Rollback

To rollback (use with caution):

```sql
-- Drop in reverse order
DROP TABLE IF EXISTS performance_events CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```
