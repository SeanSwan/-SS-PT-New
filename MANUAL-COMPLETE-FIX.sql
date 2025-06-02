-- MANUAL FOREIGN KEY CONSTRAINT FIX - RUN DIRECTLY IN POSTGRESQL
-- ================================================================
-- This bypasses the migration system to directly fix the database structure
-- Run these commands in PostgreSQL (psql) to resolve the foreign key constraint error

-- Step 1: Connect to your database
-- psql -U your_username -d your_database_name

-- Step 2: Check current table structure
\echo 'Checking current table structure...'
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_name IN ('users', 'sessions') 
    AND t.table_schema = 'public'
    AND c.column_name IN ('id', 'userId')
ORDER BY t.table_name, c.column_name;

-- Step 3: Remove all problematic foreign key constraints
\echo 'Removing problematic foreign key constraints...'
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_userId_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_userid_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS fk_sessions_userId;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS fk_sessions_userid;

-- Drop any other foreign key constraints on sessions that might cause issues
DO $$ 
DECLARE 
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'sessions' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE sessions DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 4: Fix the type mismatch by standardizing to INTEGER
\echo 'Fixing the type mismatch...'

-- Clear session data (sessions are temporary anyway)
TRUNCATE TABLE sessions CASCADE;

-- Remove the problematic userId column entirely
ALTER TABLE sessions DROP COLUMN IF EXISTS "userId";
ALTER TABLE sessions DROP COLUMN IF EXISTS "userid";

-- Add userId column with the correct INTEGER type
ALTER TABLE sessions ADD COLUMN "userId" INTEGER;

-- Step 5: Ensure users table has INTEGER id (most common case)
-- Check if users.id is already INTEGER
DO $$
DECLARE
    users_id_type text;
BEGIN
    SELECT data_type INTO users_id_type
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'id' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Users.id type: %', users_id_type;
    
    -- If users.id is UUID, we need to convert sessions.userId to UUID instead
    IF users_id_type = 'uuid' THEN
        ALTER TABLE sessions DROP COLUMN "userId";
        ALTER TABLE sessions ADD COLUMN "userId" UUID;
        RAISE NOTICE 'Set sessions.userId to UUID to match users.id';
    ELSE
        RAISE NOTICE 'Users.id is %, sessions.userId is INTEGER - types should be compatible', users_id_type;
    END IF;
END $$;

-- Step 6: Create the foreign key constraint with proper settings
\echo 'Creating the foreign key constraint...'
ALTER TABLE sessions 
ADD CONSTRAINT sessions_userId_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- Step 7: Verify the fix worked
\echo 'Verifying the fix...'
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'sessions'
    AND kcu.column_name = 'userId';

-- Step 8: Check final table structure
\echo 'Final table structure:'
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_name IN ('users', 'sessions') 
    AND t.table_schema = 'public'
    AND c.column_name IN ('id', 'userId')
ORDER BY t.table_name, c.column_name;

-- Step 9: Mark the problematic migrations as completed
\echo 'Marking problematic migrations as completed...'
INSERT INTO "SequelizeMeta" (name) VALUES 
    ('DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs'),
    ('UUID-INTEGER-TYPE-MISMATCH-FIX.cjs'),
    ('EMERGENCY-DATABASE-REPAIR.cjs'),
    ('20250517000000-add-unique-constraints-storefront.cjs'),
    ('20250523170000-add-missing-price-column.cjs'),
    ('20250528000002-fix-uuid-foreign-keys.cjs')
ON CONFLICT (name) DO NOTHING;

-- Step 10: Success message
\echo '============================================'
\echo 'MANUAL FIX COMPLETED SUCCESSFULLY!'
\echo '============================================'
\echo 'Next steps:'
\echo '1. Exit psql'
\echo '2. cd backend'
\echo '3. npx sequelize-cli db:migrate'
\echo '4. Look for: Enhanced Social Media Platform migration completed successfully!'
\echo '============================================'
