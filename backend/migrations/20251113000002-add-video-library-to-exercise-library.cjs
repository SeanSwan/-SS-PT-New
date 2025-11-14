/**
 * Migration: Add video library fields to exercise_library table
 *
 * Purpose: Track which exercises have video demonstrations
 * Features:
 * - Video count caching (denormalized for performance)
 * - Primary video designation
 * - Soft deletes alignment
 *
 * Related Tables:
 * - exercise_library (existing table - adding video-related fields)
 * - exercise_videos (new child table)
 *
 * Security:
 * - No direct security implications (read from exercise_library already has RBAC)
 * - Counts include only approved + public videos
 *
 * Created: 2025-11-13
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
