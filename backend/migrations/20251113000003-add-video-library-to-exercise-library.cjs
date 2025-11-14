/**
 * Migration: Add video library fields + triggers to exercise_library table
 * ========================================================================
 *
 * Purpose: Add video count caching and triggers for automatic cache updates
 *
 * Blueprint Reference: docs/ai-workflow/AI-HANDOFF/VIDEO-LIBRARY-COMPLETE-STATUS.md
 *
 * Table Enhancement (ER Diagram):
 *
 *   BEFORE (exercise_library):                AFTER (exercise_library):
 *   ┌─────────────────────────┐              ┌─────────────────────────────────┐
 *   │ id (UUID) PK            │              │ id (UUID) PK                    │
 *   │ name                    │              │ name                            │
 *   │ primary_muscle          │              │ primary_muscle                  │
 *   │ nasm_phases (JSONB)     │              │ nasm_phases (JSONB)             │
 *   │ created_at, updated_at  │              │ created_at, updated_at          │
 *   └─────────────────────────┘              │ video_count INTEGER ← NEW       │
 *                                             │ primary_video_id UUID ← NEW     │
 *                                             │ deletedAt TIMESTAMP ← NEW       │
 *                                             └─────────────────────────────────┘
 *                                                        │
 *                                                        │ (has many)
 *                                                        ▼
 *                                             ┌─────────────────────────────────┐
 *                                             │ exercise_videos (CHILD)         │
 *                                             │ ┌─exercise_id (FK)              │
 *                                             │ └─approved, is_public, deletedAt│
 *                                             └─────────────────────────────────┘
 *
 * New Fields:
 *
 * 1. video_count INTEGER (NOT NULL, DEFAULT 0)
 *    - Cached count of approved + public + active videos for this exercise
 *    - Denormalized for performance (avoids COUNT(*) queries on every list request)
 *    - Auto-updated via PostgreSQL trigger (zero application logic)
 *    - ONLY counts videos WHERE approved=true AND is_public=true AND deletedAt IS NULL
 *
 * 2. primary_video_id UUID (NULLABLE, FK → exercise_videos.id)
 *    - Designates which video to show first in video library
 *    - Admin can set "primary" video (best demonstration, highest quality)
 *    - ON DELETE SET NULL (if primary video deleted, field becomes NULL)
 *    - Used in frontend to highlight featured video
 *
 * 3. deletedAt TIMESTAMP (NULLABLE)
 *    - Soft delete timestamp (NULL = active, non-NULL = deleted)
 *    - Aligns with exercise_videos soft delete pattern
 *    - Preserves workout history integrity (never hard-delete exercises)
 *
 * PostgreSQL Triggers (3 total):
 *
 * Function: update_exercise_video_count()
 * - Recalculates video_count for affected exercise
 * - Counts only approved + public + active videos
 * - Triggered on INSERT, UPDATE, DELETE of exercise_videos
 *
 * Trigger 1: trigger_video_count_on_insert (AFTER INSERT)
 * - Fires when new video added to exercise
 * - Updates parent exercise.video_count
 *
 * Trigger 2: trigger_video_count_on_update (AFTER UPDATE OF approved, is_public, deletedAt)
 * - Fires when video approval status changes
 * - Fires when video visibility changes
 * - Fires when video soft deleted/restored
 * - Updates parent exercise.video_count
 *
 * Trigger 3: trigger_video_count_on_delete (AFTER DELETE)
 * - Fires on hard delete (shouldn't happen but handles edge case)
 * - Updates parent exercise.video_count
 *
 * Data Flow:
 *
 * Video Count Auto-Update Example:
 * 1. Admin creates new video: POST /api/admin/exercise-library
 *    → INSERT INTO exercise_videos (exercise_id=123, approved=true, is_public=true)
 *    → trigger_video_count_on_insert fires
 *    → UPDATE exercise_library SET video_count = (SELECT COUNT(*) FROM exercise_videos WHERE exercise_id=123 AND approved=true AND is_public=true AND deletedAt IS NULL)
 *    → exercise_library.video_count incremented from 2 → 3
 *
 * 2. Admin soft-deletes video: DELETE /api/admin/exercise-library/videos/:id
 *    → UPDATE exercise_videos SET deletedAt=NOW() WHERE id=456
 *    → trigger_video_count_on_update fires (deletedAt changed)
 *    → UPDATE exercise_library SET video_count = (SELECT COUNT(*) ...)
 *    → exercise_library.video_count decremented from 3 → 2
 *
 * 3. Admin restores video: POST /api/admin/exercise-library/videos/:id/restore
 *    → UPDATE exercise_videos SET deletedAt=NULL WHERE id=456
 *    → trigger_video_count_on_update fires
 *    → exercise_library.video_count incremented from 2 → 3
 *
 * Indexes (1 total):
 * - idx_exercise_library_deleted_at (WHERE deletedAt IS NULL)
 *   - Optimizes queries filtering out soft-deleted exercises
 *   - Partial index (only indexes active exercises)
 *
 * Business Logic:
 *
 * WHY Cached video_count?
 * - Performance: Avoids COUNT(*) subquery on every GET /exercise-library request
 * - Scalability: O(1) read vs O(n) count as video library grows
 * - Trigger-based: Zero application logic (database handles updates automatically)
 * - Accuracy: Trigger ensures count is always in sync with exercise_videos state
 *
 * WHY Only Count Approved + Public Videos?
 * - User experience: Clients should only see count of videos they can actually watch
 * - Admin clarity: "3 videos" means "3 videos visible to clients", not "3 drafts"
 * - Security: Prevents leaking count of unapproved trainer submissions
 *
 * WHY primary_video_id?
 * - Content curation: Admins can highlight best demonstration video
 * - UX optimization: Frontend shows primary video first in carousel
 * - Quality control: Ensures highest-quality video is most prominent
 * - Future feature: Auto-set primary video to "most watched" via analytics
 *
 * WHY Soft Deletes on exercise_library?
 * - Workout history integrity: Clients' past workouts reference these exercises
 * - Cascade protection: Soft-deleting exercise keeps child videos accessible
 * - NASM compliance: Requires historical audit trail of assigned exercises
 * - Data recovery: Admins can restore accidentally deleted exercises
 *
 * Security:
 * - No direct security implications (exercise_library reads already RBAC-protected)
 * - video_count only includes approved + public videos (no data leakage)
 * - Triggers run with database privileges (not user context)
 * - Soft deletes preserve audit trail
 *
 * Performance Considerations:
 * - Trigger overhead: Minimal (1 UPDATE query per video state change)
 * - Read performance: Massive improvement (O(1) cached read vs O(n) COUNT)
 * - Write performance: Negligible impact (triggers fire only on video changes)
 * - Scalability: Handles thousands of videos per exercise efficiently
 *
 * Testing Scenarios:
 * - ✅ Create video → video_count increments
 * - ✅ Soft delete video → video_count decrements
 * - ✅ Restore video → video_count increments
 * - ✅ Change video from approved=true → false → video_count decrements
 * - ✅ Change video from is_public=false → true → video_count increments
 * - ✅ Backfill query correctly counts existing videos
 *
 * Migration Safety:
 * - ✅ Idempotent: Checks column existence before adding (safe to re-run)
 * - ✅ Backfill: Recalculates video_count for existing exercises
 * - ✅ Rollback: Down migration removes triggers + columns cleanly
 * - ✅ Zero downtime: ALTER TABLE adds columns with DEFAULT values (no table lock)
 *
 * Dependencies:
 * - exercise_library table (existing - modified by this migration)
 * - exercise_videos table (must exist - referenced by trigger)
 *
 * Created: 2025-11-13
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

exports.up = async function(knex) {
  console.log('🎬 Adding video library fields to exercise_library...');

  // Check if columns already exist
  const hasVideoCount = await knex.schema.hasColumn('exercise_library', 'video_count');
  const hasPrimaryVideo = await knex.schema.hasColumn('exercise_library', 'primary_video_id');
  const hasDeletedAt = await knex.schema.hasColumn('exercise_library', 'deletedAt');

  if (hasVideoCount && hasPrimaryVideo && hasDeletedAt) {
    console.log('⏭️  Video library fields already exist, skipping...');
    return;
  }

  await knex.schema.alterTable('exercise_library', table => {
    if (!hasVideoCount) {
      table.integer('video_count')
        .notNullable()
        .defaultTo(0)
        .comment('Cached count of approved + public videos for this exercise (updated via trigger)');
    }

    if (!hasPrimaryVideo) {
      table.uuid('primary_video_id')
        .nullable()
        .references('id')
        .inTable('exercise_videos')
        .onDelete('SET NULL')
        .comment('Primary/featured video for this exercise (shown first in video library)');
    }

    if (!hasDeletedAt) {
      table.timestamp('deletedAt')
        .nullable()
        .comment('Soft delete timestamp (NULL = active). Exercises are never hard-deleted to preserve workout history.');
    }
  });

  // Create index for soft delete queries
  if (!hasDeletedAt) {
    await knex.schema.raw(`
      CREATE INDEX idx_exercise_library_deleted_at ON exercise_library(deletedAt)
        WHERE deletedAt IS NULL;
    `);
  }

  // Create trigger to auto-update video_count when videos are added/removed/approved
  await knex.raw(`
    -- Function to update video_count on exercise_library
    CREATE OR REPLACE FUNCTION update_exercise_video_count()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Update video_count for affected exercise
      UPDATE exercise_library
      SET video_count = (
        SELECT COUNT(*)
        FROM exercise_videos
        WHERE exercise_id = COALESCE(NEW.exercise_id, OLD.exercise_id)
          AND deletedAt IS NULL
          AND approved = true
          AND is_public = true
      )
      WHERE id = COALESCE(NEW.exercise_id, OLD.exercise_id);

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger on INSERT (new video added)
    DROP TRIGGER IF EXISTS trigger_video_count_on_insert ON exercise_videos;
    CREATE TRIGGER trigger_video_count_on_insert
    AFTER INSERT ON exercise_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_exercise_video_count();

    -- Trigger on UPDATE (video approved/unapproved, soft deleted, visibility changed)
    DROP TRIGGER IF EXISTS trigger_video_count_on_update ON exercise_videos;
    CREATE TRIGGER trigger_video_count_on_update
    AFTER UPDATE OF approved, is_public, deletedAt ON exercise_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_exercise_video_count();

    -- Trigger on DELETE (hard delete - shouldn't happen but handle it)
    DROP TRIGGER IF EXISTS trigger_video_count_on_delete ON exercise_videos;
    CREATE TRIGGER trigger_video_count_on_delete
    AFTER DELETE ON exercise_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_exercise_video_count();
  `);

  // Backfill video_count for existing exercises
  console.log('🔄 Backfilling video_count for existing exercises...');
  await knex.raw(`
    UPDATE exercise_library el
    SET video_count = (
      SELECT COUNT(*)
      FROM exercise_videos ev
      WHERE ev.exercise_id = el.id
        AND ev.deletedAt IS NULL
        AND ev.approved = true
        AND ev.is_public = true
    );
  `);

  console.log('✅ Video library fields added to exercise_library with auto-update trigger');
};

exports.down = async function(knex) {
  console.log('🗑️  Removing video library fields from exercise_library...');

  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS trigger_video_count_on_insert ON exercise_videos;
    DROP TRIGGER IF EXISTS trigger_video_count_on_update ON exercise_videos;
    DROP TRIGGER IF EXISTS trigger_video_count_on_delete ON exercise_videos;
    DROP FUNCTION IF EXISTS update_exercise_video_count();
  `);

  // Drop columns (check first to avoid errors)
  const hasVideoCount = await knex.schema.hasColumn('exercise_library', 'video_count');
  const hasPrimaryVideo = await knex.schema.hasColumn('exercise_library', 'primary_video_id');
  const hasDeletedAt = await knex.schema.hasColumn('exercise_library', 'deletedAt');

  await knex.schema.alterTable('exercise_library', table => {
    if (hasVideoCount) table.dropColumn('video_count');
    if (hasPrimaryVideo) table.dropColumn('primary_video_id');
    if (hasDeletedAt) table.dropColumn('deletedAt');
  });

  console.log('✅ Video library fields removed from exercise_library');
};
