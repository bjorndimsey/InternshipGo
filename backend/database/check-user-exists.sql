-- Check if user ID 19 exists and what type of user it is
SELECT 
    id,
    user_type,
    email,
    first_name,
    last_name,
    created_at
FROM users 
WHERE id = 19;

-- Check all users to see what IDs exist
SELECT 
    id,
    user_type,
    email,
    first_name,
    last_name
FROM users 
ORDER BY id
LIMIT 20;

-- Check if there are any students
SELECT 
    id,
    user_id,
    first_name,
    last_name,
    id_number
FROM students 
LIMIT 10;
