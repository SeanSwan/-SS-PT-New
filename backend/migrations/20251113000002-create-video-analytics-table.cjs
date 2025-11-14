/**
 * Migration: Create video_analytics table
 *
 * Purpose: Track detailed video engagement metrics
 * Features:
 * - Individual view tracking (not just aggregate counts)
 * - Watch duration and completion rate
 * - User engagement metrics
 * - Soft deletes for audit trail
 *
 * Related Tables:
 * - exercise_videos (parent)
 * - users (viewer tracking)
 *
 * Security:
 * - Admin-only access to raw analytics
 * - Aggregated metrics visible to trainers for their clients
 * - Soft deletes preserve historical data
 *
 * Created: 2025-11-13
 */

exports.up = async function(knex) {
  // Check if table already exists
  const exists = await knex.schema.hasTable('video_analytics');
  if (exists) {
    console.log('⏭️  Table video_analytics already exists, skipping...');
    return;
  }

  console.log('📊 Creating video_analytics table...');

  await knex.schema.createTable('video_analytics', table => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('video_id')
      .notNullable()
      .references('id')
      .inTable('exercise_videos')
      .onDelete('CASCADE')
      .comment('Video that was watched');

    table.uuid('user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who watched (NULL for anonymous views)');

    // View metrics
    table.integer('watch_duration_seconds')
      .notNullable()
      .defaultTo(0)
      .comment('Total seconds watched (may exceed video duration if rewatched)');

    table.decimal('completion_percentage', 5, 2)
      .notNullable()
      .defaultTo(0.00)
      .comment('Percentage of video watched (0.00 - 100.00). 100% = watched to end.');

    table.boolean('completed')
      .notNullable()
      .defaultTo(false)
      .comment('True if user watched >= 90% of video');

    // Engagement tracking
    table.jsonb('chapters_viewed')
      .nullable()
      .comment('Array of chapter indices viewed (e.g., [0, 1, 2] if video has chapters)');

    table.integer('replay_count')
      .notNullable()
      .defaultTo(0)
      .comment('Number of times user replayed sections (seek backwards)');

    table.integer('pause_count')
      .notNullable()
      .defaultTo(0)
      .comment('Number of times user paused during playback');

    // Session tracking
    table.string('session_id', 100)
      .nullable()
      .comment('Browser session ID for tracking single viewing session');

    table.string('device_type', 50)
      .nullable()
      .comment('Device type: mobile, tablet, desktop');

    table.string('user_agent', 500)
      .nullable()
      .comment('Browser user agent string');

    // Context tracking (where was video watched)
    table.enu('view_context', ['admin_library', 'client_dashboard', 'workout_plan', 'exercise_detail'],
      { useNative: true, enumName: 'view_context_enum' })
      .nullable()
      .comment('UI context where video was viewed');

    table.uuid('workout_id')
      .nullable()
      .comment('Workout ID if viewed from workout plan (for tracking compliance)');

    // Soft deletes (preserve analytics history)
    table.timestamp('deletedAt')
      .nullable()
      .comment('Soft delete timestamp (NULL = active). Never hard-delete analytics for compliance tracking.');

    // Timestamps
    table.timestamp('viewed_at')
      .notNullable()
      .defaultTo(knex.fn.now())
      .comment('When this view started');

    table.timestamps(true, true); // created_at, updated_at
  });

  // Create indexes for analytics queries
  await knex.schema.raw(`
    CREATE INDEX idx_video_analytics_video_id ON video_analytics(video_id) WHERE deletedAt IS NULL;
    CREATE INDEX idx_video_analytics_user_id ON video_analytics(user_id) WHERE deletedAt IS NULL;
    CREATE INDEX idx_video_analytics_viewed_at ON video_analytics(viewed_at DESC) WHERE deletedAt IS NULL;
    CREATE INDEX idx_video_analytics_completed ON video_analytics(completed) WHERE deletedAt IS NULL;
    CREATE INDEX idx_video_analytics_workout_id ON video_analytics(workout_id) WHERE deletedAt IS NULL;

    -- Composite index for common admin query (video engagement over time)
    CREATE INDEX idx_video_analytics_video_viewed ON video_analytics(video_id, viewed_at DESC)
      WHERE deletedAt IS NULL;

    -- Composite index for user watch history
    CREATE INDEX idx_video_analytics_user_viewed ON video_analytics(user_id, viewed_at DESC)
      WHERE deletedAt IS NULL;

    -- GIN index for chapters_viewed JSONB queries
    CREATE INDEX idx_video_analytics_chapters ON video_analytics USING GIN (chapters_viewed)
      WHERE deletedAt IS NULL;
  `);

  console.log('✅ video_analytics table created with soft deletes and performance indexes');
};

exports.down = async function(knex) {
  console.log('🗑️  Dropping video_analytics table...');
  await knex.schema.dropTableIfExists('video_analytics');
  await knex.raw('DROP TYPE IF EXISTS view_context_enum;');
  console.log('✅ video_analytics table dropped');
};
