# Campus Assignment Migration Guide

## 🚨 IMPORTANT: Database Migration Required

The campus assignment feature requires adding new columns to the `coordinators` table. You need to run this migration before the feature will work.

## Option 1: Supabase SQL Editor (Recommended)

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy the contents of `database/supabase-campus-assignment-migration.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the migration

4. **Verify the Migration**
   - The migration includes a verification query at the end
   - You should see the new columns: `campus_assignment`, `assigned_by`, `assigned_at`

## Option 2: Simple Migration (Recommended)

If the complex migration fails, use this simpler version:

```sql
-- Step 1: Add the new columns
ALTER TABLE coordinators 
ADD COLUMN campus_assignment VARCHAR(20),
ADD COLUMN assigned_by BIGINT,
ADD COLUMN assigned_at TIMESTAMP;

-- Step 2: Add check constraint for campus_assignment
ALTER TABLE coordinators 
ADD CONSTRAINT check_campus_assignment 
CHECK (campus_assignment IN ('in-campus', 'off-campus'));

-- Step 3: Add foreign key constraint for assigned_by
ALTER TABLE coordinators 
ADD CONSTRAINT fk_coordinators_assigned_by 
FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- Step 4: Create index for performance
CREATE INDEX idx_coordinators_campus_assignment ON coordinators(campus_assignment);
```

## Option 3: Manual SQL Commands (One by One)

If you get errors, try running these commands one at a time:

```sql
-- 1. Add columns first
ALTER TABLE coordinators ADD COLUMN campus_assignment VARCHAR(20);
ALTER TABLE coordinators ADD COLUMN assigned_by BIGINT;
ALTER TABLE coordinators ADD COLUMN assigned_at TIMESTAMP;

-- 2. Add constraints
ALTER TABLE coordinators ADD CONSTRAINT check_campus_assignment CHECK (campus_assignment IN ('in-campus', 'off-campus'));
ALTER TABLE coordinators ADD CONSTRAINT fk_coordinators_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Add index
CREATE INDEX idx_coordinators_campus_assignment ON coordinators(campus_assignment);
```

## What This Migration Does

- **Adds 3 new columns** to the `coordinators` table:
  - `campus_assignment`: Stores 'in-campus' or 'off-campus'
  - `assigned_by`: References the user who made the assignment
  - `assigned_at`: Timestamp when assignment was made

- **Adds constraints**:
  - Check constraint to ensure campus_assignment is valid
  - Foreign key to link assigned_by to users table

- **Adds performance index**:
  - Index on campus_assignment for faster queries

## After Migration

Once the migration is complete:
1. Restart your backend server
2. The campus assignment buttons will work
3. You can assign coordinators to in-campus or off-campus duties
4. The assignment status will be visible on coordinator cards

## Troubleshooting

If you get errors:
- Make sure you have the correct permissions in Supabase
- Check that the `coordinators` table exists
- Verify that the `users` table exists (for the foreign key)

## Verification

After running the migration, you can verify it worked by running:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'coordinators' 
AND column_name IN ('campus_assignment', 'assigned_by', 'assigned_at');
```

You should see all three new columns listed.
