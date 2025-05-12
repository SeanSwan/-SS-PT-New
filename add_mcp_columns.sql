-- add_mcp_columns.sql
-- Direct SQL migration script for client_progress table

-- Begin transaction
BEGIN;

-- Check if columns already exist and add them if they don't
DO $$
BEGIN
    -- Check for workoutData column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'client_progress' AND column_name = 'workoutData'
    ) THEN
        ALTER TABLE client_progress ADD COLUMN "workoutData" TEXT NULL;
        RAISE NOTICE 'Added workoutData column';
    ELSE
        RAISE NOTICE 'workoutData column already exists';
    END IF;

    -- Check for gamificationData column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'client_progress' AND column_name = 'gamificationData'
    ) THEN
        ALTER TABLE client_progress ADD COLUMN "gamificationData" TEXT NULL;
        RAISE NOTICE 'Added gamificationData column';
    ELSE
        RAISE NOTICE 'gamificationData column already exists';
    END IF;

    -- Check for lastSynced column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'client_progress' AND column_name = 'lastSynced'
    ) THEN
        ALTER TABLE client_progress ADD COLUMN "lastSynced" TIMESTAMP WITH TIME ZONE NULL;
        RAISE NOTICE 'Added lastSynced column';
    ELSE
        RAISE NOTICE 'lastSynced column already exists';
    END IF;
END $$;

-- Create dev users if they don't exist
DO $$
DECLARE
    admin_id UUID := '11111111-1111-1111-1111-111111111111';
    trainer_id UUID := '22222222-2222-2222-2222-222222222222';
    client_id UUID := '33333333-3333-3333-3333-333333333333';
    hashed_password TEXT := 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'; -- This is 'password123' hashed with SHA-256
    current_time TIMESTAMP := NOW();
BEGIN
    -- Create admin user if it doesn't exist
    IF NOT EXISTS (SELECT FROM users WHERE email = 'admin@swanstudios.com') THEN
        INSERT INTO users (
            id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt"
        ) VALUES (
            admin_id, 'admin@swanstudios.com', hashed_password, 'Admin', 'User', 'admin', current_time, current_time
        );
        RAISE NOTICE 'Created admin user: admin@swanstudios.com';
    ELSE
        RAISE NOTICE 'Admin user already exists';
    END IF;

    -- Create trainer user if it doesn't exist
    IF NOT EXISTS (SELECT FROM users WHERE email = 'trainer@swanstudios.com') THEN
        INSERT INTO users (
            id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt"
        ) VALUES (
            trainer_id, 'trainer@swanstudios.com', hashed_password, 'Trainer', 'User', 'trainer', current_time, current_time
        );
        RAISE NOTICE 'Created trainer user: trainer@swanstudios.com';
    ELSE
        RAISE NOTICE 'Trainer user already exists';
    END IF;

    -- Create client user if it doesn't exist
    IF NOT EXISTS (SELECT FROM users WHERE email = 'client@swanstudios.com') THEN
        INSERT INTO users (
            id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt"
        ) VALUES (
            client_id, 'client@swanstudios.com', hashed_password, 'Client', 'User', 'client', current_time, current_time
        );
        RAISE NOTICE 'Created client user: client@swanstudios.com';
    ELSE
        -- Get the existing client ID
        SELECT id INTO client_id FROM users WHERE email = 'client@swanstudios.com';
        RAISE NOTICE 'Client user already exists with ID: %', client_id;
    END IF;

    -- Create client progress entry if it doesn't exist
    IF NOT EXISTS (SELECT FROM client_progress WHERE "userId" = client_id) THEN
        INSERT INTO client_progress (
            id, "userId", "overallLevel", "experiencePoints", "coreLevel", "balanceLevel",
            "stabilityLevel", "flexibilityLevel", "calisthenicsLevel", "isolationLevel",
            "stabilizersLevel", "injuryPreventionLevel", "injuryRecoveryLevel", 
            "glutesLevel", "calfsLevel", "shouldersLevel", "hamstringsLevel", "absLevel",
            "chestLevel", "bicepsLevel", "tricepsLevel", "tibialisAnteriorLevel", "serratusAnteriorLevel",
            "latissimusDorsiLevel", "hipsLevel", "lowerBackLevel", "wristsForearmLevel", "neckLevel",
            "squatsLevel", "lungesLevel", "planksLevel", "reversePlanksLevel",
            "createdAt", "updatedAt",
            "workoutData", "gamificationData", "lastSynced"
        ) VALUES (
            uuid_generate_v4(), client_id, 5, 100, 5, 5, 5, 5, 5, 5, 5, 5, 5, 
            5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5,
            5, 5, 5, 5,
            current_time, current_time,
            '{"progress": {"level": 5, "experiencePoints": 100, "exercises": []}}',
            '{"profile": {"level": 5, "points": 100}, "achievements": []}',
            current_time
        );
        RAISE NOTICE 'Created initial progress data for client user';
    ELSE
        RAISE NOTICE 'Client progress data already exists';
    END IF;

END $$;

-- Commit transaction
COMMIT;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE '-------------------------------------------';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'The client_progress table has been updated with MCP data fields:';
    RAISE NOTICE '- workoutData: Raw JSON data from workout MCP server';
    RAISE NOTICE '- gamificationData: Raw JSON data from gamification MCP server';
    RAISE NOTICE '- lastSynced: Timestamp of last synchronization with MCP servers';
    RAISE NOTICE '';
    RAISE NOTICE 'Development users have been created:';
    RAISE NOTICE '- Admin: admin@swanstudios.com (password: password123)';
    RAISE NOTICE '- Trainer: trainer@swanstudios.com (password: password123)';
    RAISE NOTICE '- Client: client@swanstudios.com (password: password123)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Restart your server to apply the model changes';
    RAISE NOTICE '2. Verify the client progress tab shows synchronized data';
    RAISE NOTICE '3. Test the synchronization between dashboards';
    RAISE NOTICE '-------------------------------------------';
END $$;