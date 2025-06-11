-- DIAGNOSTIC QUERIES - RUN THESE IN POSTGRESQL TO UNDERSTAND CURRENT STATE
-- =====================================================================
-- Copy and paste these queries into psql/pgAdmin/VS Code one by one
-- and share the results so we can create a targeted fix

-- ============================================
-- 1. CHECK USERS TABLE STRUCTURE
-- ============================================
\echo '=== USERS TABLE STRUCTURE ==='
\d users

-- ============================================
-- 2. CHECK SESSIONS TABLE STRUCTURE  
-- ============================================
\echo '=== SESSIONS TABLE STRUCTURE ==='
\d sessions

-- ============================================
-- 3. CHECK EXACT COLUMN TYPES
-- ============================================
\echo '=== EXACT COLUMN TYPES ==='
SELECT 
    table_name,
    column_name, 
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('users', 'sessions') 
    AND column_name IN ('id', 'userId')
    AND table_schema = 'public'
ORDER BY table_name, column_name;

-- ============================================
-- 4. CHECK EXISTING FOREIGN KEY CONSTRAINTS ON SESSIONS
-- ============================================
\echo '=== EXISTING FOREIGN KEY CONSTRAINTS ON SESSIONS ==='
SELECT 
    conname AS constraint_name,
    confrelid::regclass AS referenced_table,
    a.attname AS constrained_column,
    af.attname AS referenced_column,
    c.contype AS constraint_type
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid = 'sessions'::regclass
    AND c.contype = 'f'
ORDER BY conname;

-- ============================================
-- 5. CHECK ALL CONSTRAINTS ON SESSIONS TABLE
-- ============================================
\echo '=== ALL CONSTRAINTS ON SESSIONS TABLE ==='
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'c' THEN 'CHECK'
        ELSE contype::text
    END AS constraint_description
FROM pg_constraint
WHERE conrelid = 'sessions'::regclass;

-- ============================================
-- 6. SAMPLE DATA IN SESSIONS.USERID (to understand data format)
-- ============================================
\echo '=== SAMPLE DATA IN SESSIONS.USERID ==='
SELECT 
    "userId",
    pg_typeof("userId") AS actual_type,
    COUNT(*) as count
FROM sessions 
GROUP BY "userId", pg_typeof("userId")
LIMIT 10;

-- ============================================
-- 7. SAMPLE DATA IN USERS.ID (to understand data format)
-- ============================================
\echo '=== SAMPLE DATA IN USERS.ID ==='
SELECT 
    id,
    pg_typeof(id) AS actual_type,
    COUNT(*) as count
FROM users 
GROUP BY id, pg_typeof(id)
LIMIT 10;

-- ============================================
-- 8. CHECK SEQUELIZE MIGRATIONS COMPLETED
-- ============================================
\echo '=== COMPLETED MIGRATIONS ==='
SELECT name FROM "SequelizeMeta" 
WHERE name LIKE '%uuid%' OR name LIKE '%foreign%' OR name LIKE '%session%'
ORDER BY name;

\echo '============================================'
\echo 'DIAGNOSTIC COMPLETE'
\echo '============================================'
\echo 'Please share ALL the output above so we can create a targeted fix!'
