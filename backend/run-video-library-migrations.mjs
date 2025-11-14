/**
 * Manual Migration Runner for Video Library
 *
 * Purpose: Run Video Library migrations manually (bypassing sequelize-cli)
 * Reason: Migrations use Knex.js syntax but project uses Sequelize
 *
 * Created: 2025-11-14
 */

import sequelize from './database.mjs';
import { QueryTypes } from 'sequelize';

async function runVideoLibraryMigrations() {
  try {
    console.log('🎬 Starting Video Library migrations...\n');

    // ==================== MIGRATION 0: Create exercise_library table ====================
    console.log('💪 Migration 0: Creating exercise_library table (NASM Foundation)...');

    const [exerciseLibExists] = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = 'exercise_library'
       )`,
      { type: QueryTypes.SELECT }
    );

    if (exerciseLibExists.exists) {
      console.log('⏭️  Table exercise_library already exists, skipping...\n');
    } else {
      await sequelize.query(`
        -- Create enums
        CREATE TYPE muscle_group_enum AS ENUM (
          'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
          'abs', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves',
          'hip_flexors', 'adductors', 'abductors'
        );

        CREATE TYPE equipment_enum AS ENUM (
          'barbell', 'dumbbell', 'kettlebell', 'resistance_band', 'cable',
          'bodyweight', 'medicine_ball', 'stability_ball', 'trx', 'bosu',
          'foam_roller', 'bench', 'machine', 'other'
        );

        CREATE TYPE difficulty_enum AS ENUM ('beginner', 'intermediate', 'advanced');

        -- Create exercise_library table
        CREATE TABLE exercise_library (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          description TEXT,
          primary_muscle muscle_group_enum NOT NULL,
          secondary_muscles JSONB DEFAULT '[]'::jsonb,
          equipment equipment_enum NOT NULL,
          difficulty difficulty_enum NOT NULL,
          movement_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
          nasm_phases JSONB NOT NULL DEFAULT '[1]'::jsonb,
          contraindications JSONB DEFAULT '[]'::jsonb,
          acute_variables JSONB,
          "deletedAt" TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX idx_exercise_library_name ON exercise_library(name) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_library_primary_muscle ON exercise_library(primary_muscle) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_library_equipment ON exercise_library(equipment) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_library_difficulty ON exercise_library(difficulty) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_library_deleted_at ON exercise_library("deletedAt") WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_library_nasm_phases ON exercise_library USING GIN (nasm_phases);
        CREATE INDEX idx_exercise_library_movement_patterns ON exercise_library USING GIN (movement_patterns);
        CREATE INDEX idx_exercise_library_contraindications ON exercise_library USING GIN (contraindications);

        -- Add comments
        COMMENT ON COLUMN exercise_library.name IS 'Exercise name (e.g., "Barbell Back Squat")';
        COMMENT ON COLUMN exercise_library.description IS 'Full exercise description with form cues';
        COMMENT ON COLUMN exercise_library.primary_muscle IS 'Primary muscle targeted (NASM muscle classification)';
        COMMENT ON COLUMN exercise_library.secondary_muscles IS 'Array of secondary muscles worked (e.g., ["abs", "glutes"])';
        COMMENT ON COLUMN exercise_library.equipment IS 'Required equipment';
        COMMENT ON COLUMN exercise_library.difficulty IS 'Exercise difficulty level';
        COMMENT ON COLUMN exercise_library.movement_patterns IS 'Array of movement patterns: ["pushing", "pulling", "squatting", "lunging", "hinging", "rotating", "anti-rotation", "gait"]';
        COMMENT ON COLUMN exercise_library.nasm_phases IS 'Array of NASM phases this exercise is appropriate for: [1,2,3,4,5]';
        COMMENT ON COLUMN exercise_library.contraindications IS 'Array of conditions where exercise should be avoided (e.g., ["shoulder_impingement", "pregnancy", "lower_back_pain"])';
        COMMENT ON COLUMN exercise_library.acute_variables IS 'Phase-specific programming: {"sets": "2-4", "reps": "12-20", "tempo": "4/2/1", "rest": "0-90s"}';
        COMMENT ON COLUMN exercise_library."deletedAt" IS 'Soft delete timestamp (NULL = active). Exercises never hard-deleted to preserve workout history.';
      `);

      // Seed foundational exercises
      await sequelize.query(`
        INSERT INTO exercise_library (name, description, primary_muscle, secondary_muscles, equipment, difficulty, movement_patterns, nasm_phases, contraindications, acute_variables)
        VALUES
          ('Barbell Back Squat', 'Foundational lower body exercise targeting quads, glutes, hamstrings. Stand with barbell on upper back, feet shoulder-width apart. Lower hips back and down to parallel, keeping chest up. Drive through heels to return to start.', 'quads', '["glutes", "hamstrings", "abs"]'::jsonb, 'barbell', 'intermediate', '["squatting"]'::jsonb, '[3, 4, 5]'::jsonb, '["knee_injury", "lower_back_pain"]'::jsonb, '{"phase_3": {"sets": "3-5", "reps": "6-12", "tempo": "2/0/2", "rest": "0-60s"}, "phase_4": {"sets": "4-6", "reps": "1-5", "tempo": "explosive", "rest": "3-5min"}}'::jsonb),
          ('Push-Up', 'Bodyweight chest exercise. Start in plank position with hands shoulder-width apart. Lower body until chest nearly touches floor. Push back up to start.', 'chest', '["triceps", "shoulders", "abs"]'::jsonb, 'bodyweight', 'beginner', '["pushing"]'::jsonb, '[1, 2, 3, 4, 5]'::jsonb, '["shoulder_impingement", "wrist_pain"]'::jsonb, '{"phase_1": {"sets": "1-3", "reps": "12-20", "tempo": "4/2/1", "rest": "0-90s"}}'::jsonb),
          ('Dumbbell Romanian Deadlift', 'Hip hinge pattern targeting hamstrings and glutes. Hold dumbbells at thighs. Hinge at hips while keeping back straight, lowering dumbbells to mid-shin. Return to start by driving hips forward.', 'hamstrings', '["glutes", "back"]'::jsonb, 'dumbbell', 'intermediate', '["hinging"]'::jsonb, '[2, 3, 4, 5]'::jsonb, '["lower_back_pain", "hamstring_strain"]'::jsonb, '{"phase_2": {"sets": "2-4", "reps": "8-12", "tempo": "2/0/2", "rest": "0-60s"}}'::jsonb),
          ('Plank', 'Core stabilization exercise. Hold push-up position with forearms on ground. Maintain straight line from head to heels, engaging abs.', 'abs', '["obliques", "back", "shoulders"]'::jsonb, 'bodyweight', 'beginner', '["anti-rotation"]'::jsonb, '[1, 2, 3, 4, 5]'::jsonb, '["lower_back_pain", "pregnancy"]'::jsonb, '{"phase_1": {"sets": "1-3", "duration": "15-60s", "tempo": "hold", "rest": "0-90s"}}'::jsonb),
          ('Dumbbell Bench Press', 'Upper body pressing movement for chest, shoulders, triceps. Lie on bench with dumbbells at chest height. Press dumbbells up until arms are extended. Lower with control.', 'chest', '["shoulders", "triceps"]'::jsonb, 'dumbbell', 'intermediate', '["pushing"]'::jsonb, '[3, 4, 5]'::jsonb, '["shoulder_impingement", "shoulder_instability"]'::jsonb, '{"phase_3": {"sets": "3-5", "reps": "6-12", "tempo": "2/0/2", "rest": "0-60s"}}'::jsonb);
      `);

      console.log('✅ exercise_library table created with 5 foundational exercises\n');
    }

    // ==================== MIGRATION 1: Create exercise_videos table ====================
    console.log('📹 Migration 1: Creating exercise_videos table...');

    const [videosTableExists] = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = 'exercise_videos'
       )`,
      { type: QueryTypes.SELECT }
    );

    if (videosTableExists.exists) {
      console.log('⏭️  Table exercise_videos already exists, skipping...\n');
    } else {
      await sequelize.query(`
        -- Create video_type enum
        DO $$ BEGIN
          CREATE TYPE video_type_enum AS ENUM ('youtube', 'upload');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        -- Create exercise_videos table
        CREATE TABLE exercise_videos (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
          uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          video_type video_type_enum NOT NULL,
          video_id VARCHAR(200) NOT NULL,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          duration_seconds INTEGER NOT NULL,
          thumbnail_url VARCHAR(500),
          hls_manifest_url VARCHAR(500),
          hls_variants JSONB,
          original_filename VARCHAR(300),
          file_size_bytes BIGINT,
          chapters JSONB,
          approved BOOLEAN NOT NULL DEFAULT true,
          approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          approved_at TIMESTAMP,
          is_public BOOLEAN NOT NULL DEFAULT true,
          views INTEGER NOT NULL DEFAULT 0,
          tags JSONB,
          "deletedAt" TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX idx_exercise_videos_exercise_id ON exercise_videos(exercise_id) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_videos_uploader_id ON exercise_videos(uploader_id) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_videos_video_type ON exercise_videos(video_type) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_videos_approved ON exercise_videos(approved) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_videos_is_public ON exercise_videos(is_public) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_videos_created_at ON exercise_videos(created_at DESC) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_videos_views ON exercise_videos(views DESC) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_videos_tags ON exercise_videos USING GIN (tags) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_exercise_videos_active_public ON exercise_videos(exercise_id, approved, is_public)
          WHERE "deletedAt" IS NULL AND approved = true AND is_public = true;

        -- Add comments
        COMMENT ON COLUMN exercise_videos.exercise_id IS 'Parent exercise (one exercise can have multiple video demonstrations)';
        COMMENT ON COLUMN exercise_videos.uploader_id IS 'User who uploaded/added this video (NULL if system-added)';
        COMMENT ON COLUMN exercise_videos.video_type IS 'Source type: youtube (YouTube Data API) or upload (direct file upload)';
        COMMENT ON COLUMN exercise_videos.video_id IS 'YouTube video ID (if type=youtube) or S3/storage key (if type=upload)';
        COMMENT ON COLUMN exercise_videos.title IS 'Video title (auto-fetched for YouTube, manual for uploads)';
        COMMENT ON COLUMN exercise_videos.description IS 'Full video description (optional)';
        COMMENT ON COLUMN exercise_videos.duration_seconds IS 'Video duration in seconds (required for chapter navigation)';
        COMMENT ON COLUMN exercise_videos.thumbnail_url IS 'Thumbnail URL (auto-fetched for YouTube, generated for uploads)';
        COMMENT ON COLUMN exercise_videos.hls_manifest_url IS 'HLS .m3u8 manifest URL for adaptive bitrate streaming (upload videos only)';
        COMMENT ON COLUMN exercise_videos.hls_variants IS 'HLS quality variants (360p, 480p, 720p, 1080p) with bandwidth info (upload videos only)';
        COMMENT ON COLUMN exercise_videos.original_filename IS 'Original uploaded filename (upload videos only)';
        COMMENT ON COLUMN exercise_videos.file_size_bytes IS 'File size in bytes (upload videos only)';
        COMMENT ON COLUMN exercise_videos.chapters IS 'Array of {timestamp: 15, title: "Setup", description: "..."} for video chapters';
        COMMENT ON COLUMN exercise_videos.approved IS 'Admin approval status (false = pending review, true = approved for public use)';
        COMMENT ON COLUMN exercise_videos.approved_by IS 'Admin who approved this video (NULL if auto-approved)';
        COMMENT ON COLUMN exercise_videos.approved_at IS 'Timestamp when video was approved';
        COMMENT ON COLUMN exercise_videos.is_public IS 'Public visibility (false = admin/trainer only, true = visible to all clients)';
        COMMENT ON COLUMN exercise_videos.views IS 'Total view count (incremented on video play)';
        COMMENT ON COLUMN exercise_videos.tags IS 'Array of string tags for search/filtering (e.g., ["beginner", "no-equipment"])';
        COMMENT ON COLUMN exercise_videos."deletedAt" IS 'Soft delete timestamp (NULL = active, non-NULL = deleted). Videos are never hard-deleted to preserve workout history.';
      `);

      console.log('✅ exercise_videos table created with soft deletes and indexes\n');
    }

    // ==================== MIGRATION 2: Create video_analytics table ====================
    console.log('📊 Migration 2: Creating video_analytics table...');

    const [analyticsTableExists] = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public'
         AND table_name = 'video_analytics'
       )`,
      { type: QueryTypes.SELECT }
    );

    if (analyticsTableExists.exists) {
      console.log('⏭️  Table video_analytics already exists, skipping...\n');
    } else {
      await sequelize.query(`
        -- Create view_context enum
        DO $$ BEGIN
          CREATE TYPE view_context_enum AS ENUM ('admin_library', 'client_dashboard', 'workout_plan', 'exercise_detail');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;

        -- Create video_analytics table
        CREATE TABLE video_analytics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          video_id UUID NOT NULL REFERENCES exercise_videos(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          watch_duration_seconds INTEGER NOT NULL DEFAULT 0,
          completion_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
          completed BOOLEAN NOT NULL DEFAULT false,
          chapters_viewed JSONB,
          replay_count INTEGER NOT NULL DEFAULT 0,
          pause_count INTEGER NOT NULL DEFAULT 0,
          session_id VARCHAR(100),
          device_type VARCHAR(50),
          user_agent VARCHAR(500),
          view_context view_context_enum,
          workout_id UUID,
          "deletedAt" TIMESTAMP,
          viewed_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX idx_video_analytics_video_id ON video_analytics(video_id) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_video_analytics_user_id ON video_analytics(user_id) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_video_analytics_viewed_at ON video_analytics(viewed_at DESC) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_video_analytics_completed ON video_analytics(completed) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_video_analytics_workout_id ON video_analytics(workout_id) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_video_analytics_video_viewed ON video_analytics(video_id, viewed_at DESC) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_video_analytics_user_viewed ON video_analytics(user_id, viewed_at DESC) WHERE "deletedAt" IS NULL;
        CREATE INDEX idx_video_analytics_chapters ON video_analytics USING GIN (chapters_viewed) WHERE "deletedAt" IS NULL;

        -- Add comments
        COMMENT ON COLUMN video_analytics.video_id IS 'Video that was watched';
        COMMENT ON COLUMN video_analytics.user_id IS 'User who watched (NULL for anonymous views)';
        COMMENT ON COLUMN video_analytics.watch_duration_seconds IS 'Total seconds watched (may exceed video duration if rewatched)';
        COMMENT ON COLUMN video_analytics.completion_percentage IS 'Percentage of video watched (0.00 - 100.00). 100% = watched to end.';
        COMMENT ON COLUMN video_analytics.completed IS 'True if user watched >= 90% of video';
        COMMENT ON COLUMN video_analytics.chapters_viewed IS 'Array of chapter indices viewed (e.g., [0, 1, 2] if video has chapters)';
        COMMENT ON COLUMN video_analytics.replay_count IS 'Number of times user replayed sections (seek backwards)';
        COMMENT ON COLUMN video_analytics.pause_count IS 'Number of times user paused during playback';
        COMMENT ON COLUMN video_analytics.session_id IS 'Browser session ID for tracking single viewing session';
        COMMENT ON COLUMN video_analytics.device_type IS 'Device type: mobile, tablet, desktop';
        COMMENT ON COLUMN video_analytics.user_agent IS 'Browser user agent string';
        COMMENT ON COLUMN video_analytics.view_context IS 'UI context where video was viewed';
        COMMENT ON COLUMN video_analytics.workout_id IS 'Workout ID if viewed from workout plan (for tracking compliance)';
        COMMENT ON COLUMN video_analytics."deletedAt" IS 'Soft delete timestamp (NULL = active). Never hard-delete analytics for compliance tracking.';
        COMMENT ON COLUMN video_analytics.viewed_at IS 'When this view started';
      `);

      console.log('✅ video_analytics table created with soft deletes and indexes\n');
    }

    // ==================== MIGRATION 3: Add video fields to exercise_library ====================
    console.log('🎬 Migration 3: Adding video library fields to exercise_library...');

    const [videoCountExists] = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.columns
         WHERE table_schema = 'public'
         AND table_name = 'exercise_library'
         AND column_name = 'video_count'
       )`,
      { type: QueryTypes.SELECT }
    );

    if (videoCountExists.exists) {
      console.log('⏭️  Video library fields already exist, skipping...\n');
    } else {
      await sequelize.query(`
        -- Add video_count column
        ALTER TABLE exercise_library
        ADD COLUMN IF NOT EXISTS video_count INTEGER NOT NULL DEFAULT 0;

        COMMENT ON COLUMN exercise_library.video_count IS 'Cached count of approved + public videos for this exercise (updated via trigger)';

        -- Add primary_video_id column
        ALTER TABLE exercise_library
        ADD COLUMN IF NOT EXISTS primary_video_id UUID REFERENCES exercise_videos(id) ON DELETE SET NULL;

        COMMENT ON COLUMN exercise_library.primary_video_id IS 'Primary/featured video for this exercise (shown first in video library)';

        -- Add deletedAt column if it doesn't exist
        ALTER TABLE exercise_library
        ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

        COMMENT ON COLUMN exercise_library."deletedAt" IS 'Soft delete timestamp (NULL = active). Exercises are never hard-deleted to preserve workout history.';

        -- Create index for soft delete queries
        CREATE INDEX IF NOT EXISTS idx_exercise_library_deleted_at
        ON exercise_library("deletedAt") WHERE "deletedAt" IS NULL;

        -- Create trigger to auto-update video_count
        CREATE OR REPLACE FUNCTION update_exercise_video_count()
        RETURNS TRIGGER AS $$
        BEGIN
          UPDATE exercise_library
          SET video_count = (
            SELECT COUNT(*)
            FROM exercise_videos
            WHERE exercise_id = COALESCE(NEW.exercise_id, OLD.exercise_id)
              AND "deletedAt" IS NULL
              AND approved = true
              AND is_public = true
          )
          WHERE id = COALESCE(NEW.exercise_id, OLD.exercise_id);

          RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql;

        -- Trigger on INSERT
        DROP TRIGGER IF EXISTS trigger_video_count_on_insert ON exercise_videos;
        CREATE TRIGGER trigger_video_count_on_insert
        AFTER INSERT ON exercise_videos
        FOR EACH ROW
        EXECUTE FUNCTION update_exercise_video_count();

        -- Trigger on UPDATE
        DROP TRIGGER IF EXISTS trigger_video_count_on_update ON exercise_videos;
        CREATE TRIGGER trigger_video_count_on_update
        AFTER UPDATE OF approved, is_public, "deletedAt" ON exercise_videos
        FOR EACH ROW
        EXECUTE FUNCTION update_exercise_video_count();

        -- Trigger on DELETE
        DROP TRIGGER IF EXISTS trigger_video_count_on_delete ON exercise_videos;
        CREATE TRIGGER trigger_video_count_on_delete
        AFTER DELETE ON exercise_videos
        FOR EACH ROW
        EXECUTE FUNCTION update_exercise_video_count();

        -- Backfill video_count for existing exercises
        UPDATE exercise_library el
        SET video_count = (
          SELECT COUNT(*)
          FROM exercise_videos ev
          WHERE ev.exercise_id = el.id
            AND ev."deletedAt" IS NULL
            AND ev.approved = true
            AND ev.is_public = true
        );
      `);

      console.log('✅ Video library fields added to exercise_library with auto-update trigger\n');
    }

    // ==================== VERIFICATION ====================
    console.log('🔍 Verifying migrations...\n');

    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('exercise_videos', 'video_analytics')
      ORDER BY table_name
    `, { type: QueryTypes.SELECT });

    console.log('📋 Created tables:');
    tables.forEach(t => console.log(`   ✅ ${t.table_name}`));

    const [columns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'exercise_library'
      AND column_name IN ('video_count', 'primary_video_id', 'deletedAt')
      ORDER BY column_name
    `, { type: QueryTypes.SELECT });

    console.log('\n📋 Added columns to exercise_library:');
    columns.forEach(c => console.log(`   ✅ ${c.column_name}`));

    console.log('\n🎉 Video Library migrations completed successfully!');
    console.log('\n📚 Next steps:');
    console.log('   1. Test API endpoints with Roo Code');
    console.log('   2. Verify soft deletes work correctly');
    console.log('   3. Test YouTube metadata fetching');
    console.log('   4. Verify video_count trigger updates automatically\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📚 Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run migrations
runVideoLibraryMigrations();
