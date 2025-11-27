# Classes and Student Enrollments Migration

This migration adds support for coordinators to create classes and students to enroll in those classes using class codes.

## Overview

The system allows:
- **Coordinators** to create classes with a name, school year, and unique 6-character code
- **Students** to enroll in classes using the generated class code
- Track enrollment status (enrolled, dropped, completed)
- Manage class status (active, inactive, archived)

## Database Schema

### Classes Table
Stores class information created by coordinators.

**Fields:**
- `id` - Primary key (BIGSERIAL)
- `class_name` - Name of the class (VARCHAR(255))
- `school_year` - School year for the class (VARCHAR(20), e.g., "2024-2025")
- `class_code` - Unique 6-character enrollment code (VARCHAR(6), UNIQUE)
- `coordinator_id` - Foreign key to coordinators table (BIGINT)
- `description` - Optional class description (TEXT)
- `status` - Class status: 'active', 'inactive', or 'archived' (VARCHAR(20))
- `created_at` - Timestamp when class was created
- `updated_at` - Timestamp when class was last updated

### Class Enrollments Table
Junction table linking students to classes.

**Fields:**
- `id` - Primary key (BIGSERIAL)
- `class_id` - Foreign key to classes table (BIGINT)
- `student_id` - Foreign key to students table (BIGINT)
- `enrolled_at` - Timestamp when student enrolled
- `status` - Enrollment status: 'enrolled', 'dropped', or 'completed' (VARCHAR(20))
- Unique constraint on (class_id, student_id) to prevent duplicate enrollments

## Migration Files

1. **classes-schema.sql** - Full schema definition (for new databases)
2. **classes-migration.sql** - Migration script (for existing databases)
3. **supabase-classes-migration.sql** - Supabase-compatible version

## How to Apply

### For Supabase:
1. Open Supabase SQL Editor
2. Copy and paste the contents of `supabase-classes-migration.sql`
3. Execute the script

### For PostgreSQL:
1. Connect to your database
2. Run the `classes-migration.sql` script
3. Verify tables were created successfully

## Usage Flow

1. **Coordinator creates a class:**
   - Provides class name
   - Selects school year
   - System generates unique 6-character code
   - Class is saved to `classes` table

2. **Student enrolls in class:**
   - Student enters the class code
   - System validates code exists and is active
   - Creates enrollment record in `class_enrollments` table
   - Status is set to 'enrolled'

3. **Managing enrollments:**
   - Coordinator can view all students in their classes
   - Students can view their enrolled classes
   - Status can be updated (enrolled → dropped/completed)

## Indexes

The following indexes are created for performance:
- `idx_classes_coordinator_id` - Fast lookup of classes by coordinator
- `idx_classes_school_year` - Filter classes by school year
- `idx_classes_class_code` - Fast code lookup for enrollment
- `idx_classes_status` - Filter by class status
- `idx_class_enrollments_class_id` - Fast lookup of students in a class
- `idx_class_enrollments_student_id` - Fast lookup of classes for a student
- `idx_class_enrollments_status` - Filter enrollments by status

## Example Queries

### Get all classes for a coordinator:
```sql
SELECT * FROM classes WHERE coordinator_id = ? AND status = 'active';
```

### Get all students in a class:
```sql
SELECT s.*, ce.enrolled_at, ce.status 
FROM class_enrollments ce
JOIN students s ON ce.student_id = s.id
WHERE ce.class_id = ? AND ce.status = 'enrolled';
```

### Get all classes for a student:
```sql
SELECT c.*, ce.enrolled_at, ce.status
FROM class_enrollments ce
JOIN classes c ON ce.class_id = c.id
WHERE ce.student_id = ? AND ce.status = 'enrolled';
```

### Enroll a student in a class:
```sql
INSERT INTO class_enrollments (class_id, student_id, status)
VALUES (?, ?, 'enrolled')
ON CONFLICT (class_id, student_id) DO NOTHING;
```

## Notes

- Class codes are unique and 6 characters long (alphanumeric)
- A student can only be enrolled once per class (enforced by UNIQUE constraint)
- When a coordinator is deleted, their classes are also deleted (CASCADE)
- When a class is deleted, all enrollments are deleted (CASCADE)
- When a student is deleted, their enrollments are deleted (CASCADE)

