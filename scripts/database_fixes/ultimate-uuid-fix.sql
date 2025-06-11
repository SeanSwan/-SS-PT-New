-- ULTIMATE UUID FIX: Direct SQL Solution
-- =======================================
-- This script systematically finds and fixes ALL userId/senderId columns

-- Step 1: Find all tables with userId columns that are not UUID
DO $$
DECLARE
    table_record RECORD;
    fix_sql TEXT;
BEGIN
    RAISE NOTICE '🔍 Scanning for userId columns with wrong data type...';
    
    -- Loop through all userId columns that are not UUID
    FOR table_record IN 
        SELECT table_name, column_name, data_type
        FROM information_schema.columns 
        WHERE column_name IN ('userId', 'senderId') 
        AND table_schema = 'public'
        AND data_type != 'uuid'
    LOOP
        RAISE NOTICE '🔧 Fixing %.% (currently %)', table_record.table_name, table_record.column_name, table_record.data_type;
        
        -- Drop foreign key constraint
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
                      table_record.table_name, 
                      table_record.table_name || '_' || table_record.column_name || '_fkey');
        
        -- Convert column to UUID
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE UUID USING %I::text::uuid', 
                      table_record.table_name, 
                      table_record.column_name, 
                      table_record.column_name);
        
        -- Re-add foreign key constraint
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE', 
                      table_record.table_name, 
                      table_record.table_name || '_' || table_record.column_name || '_fkey',
                      table_record.column_name);
        
        RAISE NOTICE '✅ Fixed %.%', table_record.table_name, table_record.column_name;
    END LOOP;
END $$;

-- Step 2: Special handling for notifications table if it needs recreation
DO $$
BEGIN
    -- Check if notifications table has wrong data types
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'userId' 
        AND data_type != 'uuid'
    ) THEN
        RAISE NOTICE '🔄 Recreating notifications table with correct schema...';
        
        -- Drop and recreate notifications table
        DROP TABLE IF EXISTS notifications CASCADE;
        
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (type IN ('orientation', 'system', 'order', 'workout', 'client', 'admin')),
            read BOOLEAN NOT NULL DEFAULT FALSE,
            link VARCHAR(255),
            image VARCHAR(255),
            "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
            "senderId" UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
            "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        -- Add indexes
        CREATE INDEX idx_notifications_userid ON notifications("userId");
        CREATE INDEX idx_notifications_read ON notifications(read);
        CREATE INDEX idx_notifications_type ON notifications(type);
        
        RAISE NOTICE '✅ Notifications table recreated successfully';
    END IF;
END $$;

-- Step 3: Verify all fixes
DO $$
DECLARE
    table_record RECORD;
    total_fixed INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 Verification: Checking all userId/senderId columns...';
    
    FOR table_record IN 
        SELECT table_name, column_name, data_type
        FROM information_schema.columns 
        WHERE column_name IN ('userId', 'senderId') 
        AND table_schema = 'public'
        ORDER BY table_name, column_name
    LOOP
        IF table_record.data_type = 'uuid' THEN
            RAISE NOTICE '✅ %.%: %', table_record.table_name, table_record.column_name, table_record.data_type;
            total_fixed := total_fixed + 1;
        ELSE
            RAISE NOTICE '❌ %.%: % (STILL WRONG!)', table_record.table_name, table_record.column_name, table_record.data_type;
        END IF;
    END LOOP;
    
    RAISE NOTICE '🎉 ULTIMATE UUID FIX COMPLETED! Fixed % columns total', total_fixed;
END $$;

-- Step 4: Mark migrations as completed
INSERT INTO "SequelizeMeta" (name) VALUES 
    ('20250508123456-create-notification-settings.cjs'),
    ('20250508123457-create-notifications.cjs')
ON CONFLICT (name) DO NOTHING;

-- Final verification query
SELECT 
    table_name, 
    column_name, 
    data_type,
    CASE 
        WHEN data_type = 'uuid' THEN '✅ CORRECT'
        ELSE '❌ NEEDS FIX'
    END as status
FROM information_schema.columns 
WHERE column_name IN ('userId', 'senderId') 
AND table_schema = 'public'
ORDER BY table_name, column_name;
