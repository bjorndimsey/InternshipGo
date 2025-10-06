# Middle Name Migration for Supabase

This migration adds the `middle_name` column to both the `students` and `coordinators` tables in your Supabase database.

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** tab
3. Copy the contents of `supabase-middle-name-migration.sql`
4. Paste it into the SQL editor
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

## What the Migration Does

1. **Adds `middle_name` column** to both `students` and `coordinators` tables
2. **Sets default value** to 'N/A' for the new column
3. **Updates existing records** to have 'N/A' if they are NULL
4. **Verifies the changes** by showing record counts

## Database Schema Changes

### Students Table
```sql
ALTER TABLE students ADD COLUMN middle_name VARCHAR(100) DEFAULT 'N/A';
```

### Coordinators Table
```sql
ALTER TABLE coordinators ADD COLUMN middle_name VARCHAR(100) DEFAULT 'N/A';
```

## Frontend Integration

The frontend has been updated to:
- Include middle name input fields in registration forms
- Send middle name data to the backend
- Display middle name in user profiles
- Default to 'N/A' if no middle name is provided

## Backend Integration

The backend has been updated to:
- Accept middle name in registration requests
- Store middle name in the database
- Return middle name in API responses
- Handle middle name in user updates

## Verification

After running the migration, you can verify it worked by checking:

1. The `students` table has a `middle_name` column
2. The `coordinators` table has a `middle_name` column
3. Existing records have 'N/A' as the middle name value
4. New registrations include the middle name field

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove middle_name column from students table
ALTER TABLE students DROP COLUMN IF EXISTS middle_name;

-- Remove middle_name column from coordinators table
ALTER TABLE coordinators DROP COLUMN IF EXISTS middle_name;
```

**Note:** This will permanently delete all middle name data.
