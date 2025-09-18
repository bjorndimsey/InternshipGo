-- Migration to populate interns table with existing student-coordinator relationships
-- This ensures that students are properly assigned to coordinators

-- First, let's check if there are any existing interns
SELECT 'Current interns count:' as info, COUNT(*) as count FROM interns;

-- Check if there are students without coordinator assignments
SELECT 'Students without coordinator assignments:' as info, COUNT(*) as count 
FROM students s 
LEFT JOIN interns i ON s.id = i.student_id 
WHERE i.student_id IS NULL;

-- Check if there are coordinators
SELECT 'Coordinators count:' as info, COUNT(*) as count FROM coordinators;

-- For demonstration purposes, let's assign some students to coordinators
-- This is a sample assignment - in a real scenario, you would have a proper assignment process

-- Assign students to coordinators based on some criteria (e.g., program, year, etc.)
-- This is just an example - you should modify this based on your actual assignment logic

INSERT INTO interns (student_id, school_year, coordinator_id, status)
SELECT 
    s.id as student_id,
    '2024-2025' as school_year,
    c.user_id as coordinator_id,
    'active' as status
FROM students s
CROSS JOIN coordinators c
WHERE s.id NOT IN (SELECT student_id FROM interns)
  AND c.user_id IS NOT NULL
  -- Add your assignment criteria here, for example:
  -- AND s.program = c.program  -- if coordinators have programs
  -- AND s.year = '4th'         -- if you want to assign only 4th year students
LIMIT 10; -- Limit to prevent too many assignments

-- Check the results
SELECT 'After assignment - interns count:' as info, COUNT(*) as count FROM interns;

-- Show the assignments
SELECT 
    i.id as intern_id,
    s.first_name || ' ' || s.last_name as student_name,
    s.id_number,
    c.first_name || ' ' || c.last_name as coordinator_name,
    u.email as coordinator_email,
    i.school_year,
    i.status
FROM interns i
JOIN students s ON i.student_id = s.id
JOIN coordinators c ON i.coordinator_id = c.user_id
JOIN users u ON c.user_id = u.id
ORDER BY i.created_at DESC;
