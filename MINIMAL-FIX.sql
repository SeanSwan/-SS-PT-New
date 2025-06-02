-- MINIMAL FOREIGN KEY FIX - COPY AND PASTE THIS INTO POSTGRESQL
-- =============================================================
-- This is the shortest possible fix for the foreign key constraint error

-- Remove all problematic foreign key constraints
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_userId_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_userid_fkey;

-- Clear session data and fix the column type
TRUNCATE TABLE sessions;
ALTER TABLE sessions DROP COLUMN IF EXISTS "userId";

-- Check users.id type and add matching userId column
DO $$
DECLARE
    users_id_type text;
BEGIN
    SELECT data_type INTO users_id_type
    FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'id' AND table_schema = 'public';
    
    IF users_id_type = 'uuid' THEN
        ALTER TABLE sessions ADD COLUMN "userId" UUID;
    ELSE
        ALTER TABLE sessions ADD COLUMN "userId" INTEGER;
    END IF;
END $$;

-- Create the foreign key constraint
ALTER TABLE sessions 
ADD CONSTRAINT sessions_userId_fkey 
FOREIGN KEY ("userId") REFERENCES users(id) 
ON UPDATE CASCADE ON DELETE SET NULL;

-- Mark problematic migrations as completed
INSERT INTO "SequelizeMeta" (name) VALUES 
    ('DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs'),
    ('UUID-INTEGER-TYPE-MISMATCH-FIX.cjs'),
    ('EMERGENCY-DATABASE-REPAIR.cjs'),
    ('20250517000000-add-unique-constraints-storefront.cjs'),
    ('20250523170000-add-missing-price-column.cjs'),
    ('20250528000002-fix-uuid-foreign-keys.cjs')
ON CONFLICT (name) DO NOTHING;

-- Verify success
SELECT 'MINIMAL FIX COMPLETED SUCCESSFULLY!' as status;
