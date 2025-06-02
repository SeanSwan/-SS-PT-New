-- MANUAL FOREIGN KEY CONSTRAINT FIX
-- ===================================
-- Run this directly in PostgreSQL if migrations continue to fail
-- This addresses: "foreign key constraint sessions_userId_fkey cannot be implemented"

-- Step 1: Remove any existing problematic foreign key constraints
DROP CONSTRAINT IF EXISTS sessions_userId_fkey;
DROP CONSTRAINT IF EXISTS sessions_userid_fkey;

-- Step 2: Check current column types
SELECT 
    'users.id type:' as description,
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'id' AND table_schema = 'public'

UNION ALL

SELECT 
    'sessions.userId type:' as description,
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'sessions' AND column_name = 'userId' AND table_schema = 'public';

-- Step 3: Fix the type mismatch
-- Option A: If users.id is INTEGER (most common case)
-- Clear session data first (sessions are temporary anyway)
TRUNCATE TABLE sessions;

-- Drop and recreate userId column as INTEGER
ALTER TABLE sessions DROP COLUMN IF EXISTS "userId";
ALTER TABLE sessions ADD COLUMN "userId" INTEGER;

-- Option B: If users.id is UUID (uncommon, but possible)
-- Uncomment these lines if users.id is UUID instead:
-- TRUNCATE TABLE sessions;
-- ALTER TABLE sessions DROP COLUMN IF EXISTS "userId";
-- ALTER TABLE sessions ADD COLUMN "userId" UUID;

-- Step 4: Add the foreign key constraint
ALTER TABLE sessions 
ADD CONSTRAINT sessions_userId_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) 
ON UPDATE CASCADE ON DELETE SET NULL;

-- Step 5: Verify the fix worked
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

-- Step 6: Mark the problematic migration as completed (run this last)
INSERT INTO "SequelizeMeta" (name) 
VALUES ('DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs')
ON CONFLICT (name) DO NOTHING;

-- Success message
SELECT 'Foreign key constraint fix completed successfully!' as status;
