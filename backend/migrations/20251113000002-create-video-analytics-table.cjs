/**
 * Migration: Create video_analytics table
 * =========================================
 *
 * Purpose: Track detailed video engagement metrics for NASM compliance and UX optimization
 *
 * Blueprint Reference: docs/ai-workflow/AI-HANDOFF/VIDEO-LIBRARY-COMPLETE-STATUS.md
 *
 * Table Relationships (ER Diagram):
 *
 *   users (one)                    exercise_videos (PARENT)
 *     │                                    │
 *     │                                    │
 *     │ (watches)                          │ (has many views)
 *     │                                    │
 *     ▼                                    ▼
 *   ┌─────────────────────────────────────────────────────────┐
 *   │ video_analytics (CHILD - Many-to-One)                   │
 *   ├─────────────────────────────────────────────────────────┤
 *   │ id (UUID) PK - Unique analytics record identifier       │
 *   │ video_id (UUID) FK → exercise_videos.id (CASCADE)       │
 *   │ user_id (UUID) FK → users.id (SET NULL)                 │
 *   │ watch_duration_seconds INTEGER - Total seconds watched  │
 *   │ completion_percentage DECIMAL(5,2) - 0.00-100.00        │
 *   │ completed BOOLEAN - True if >= 90% watched              │
 *   │ chapters_viewed JSONB - Array of chapter indices        │
 *   │ replay_count INTEGER - Number of rewinds                │
 *   │ pause_count INTEGER - Number of pauses                  │
 *   │ session_id VARCHAR(100) - Browser session tracking      │
 *   │ device_type VARCHAR(50) - mobile/tablet/desktop         │
 *   │ user_agent VARCHAR(500) - Browser identification        │
 *   │ view_context ENUM - Where video was viewed              │
 *   │ workout_id UUID - If viewed from workout plan           │
 *   │ viewed_at TIMESTAMP - When view started                 │
 *   │ deletedAt TIMESTAMP - Soft delete (NULL = active)       │
 *   │ created_at, updated_at TIMESTAMP                        │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Key Features:
 * - ✅ Individual view tracking (not just aggregate counts on exercise_videos.views)
 * - ✅ Watch duration and completion rate (compliance tracking)
 * - ✅ Chapter navigation analytics (UX optimization)
 * - ✅ Engagement metrics (replay_count, pause_count for content quality insights)
 * - ✅ Device/browser tracking (responsive design optimization)
 * - ✅ Context tracking (view_context: admin, client dashboard, workout plan)
 * - ✅ Workout compliance tracking (workout_id links analytics to assigned workouts)
 * - ✅ Soft deletes (preserves historical analytics for NASM compliance)
 * - ✅ GIN indexed JSONB for fast chapter analytics
 *
 * Data Flow:
 *
 * Video View Tracking (Client Dashboard):
 * 1. Client clicks "Play" on exercise video in workout plan
 * 2. Frontend tracks: play time, pause events, seek events, completion percentage
 * 3. On video close/page navigation: POST /api/admin/exercise-library/videos/:id/track-view
 * 4. Backend creates video_analytics record with:
 *    - video_id (which video)
 *    - user_id (who watched)
 *    - watch_duration_seconds (total time watched)
 *    - completion_percentage (how much of video was watched)
 *    - chapters_viewed (which chapters were navigated to)
 *    - replay_count, pause_count (engagement metrics)
 *    - workout_id (if viewed from assigned workout)
 * 5. Backend increments exercise_videos.views counter
 * 6. Analytics available in admin dashboard for content optimization
 *
 * Use Cases:
 *
 * NASM Compliance Tracking:
 * - Trainers can verify clients watched assigned exercise videos
 * - completion_percentage >= 90% = client understands proper form
 * - workout_id links video views to specific workout assignments
 *
 * Content Quality Insights:
 * - High replay_count = confusing section (needs better explanation)
 * - High pause_count = information-dense (clients taking notes)
 * - Low completion_percentage = video too long or boring
 * - chapters_viewed patterns show which sections are most valuable
 *
 * UX Optimization:
 * - device_type analytics inform mobile vs desktop design priorities
 * - view_context shows where clients engage most with videos
 * - session_id enables "resume where you left off" feature
 *
 * Indexes (8 total):
 * - idx_video_analytics_video_id (WHERE deletedAt IS NULL)
 * - idx_video_analytics_user_id (WHERE deletedAt IS NULL)
 * - idx_video_analytics_viewed_at DESC (WHERE deletedAt IS NULL)
 * - idx_video_analytics_completed (WHERE deletedAt IS NULL)
 * - idx_video_analytics_workout_id (WHERE deletedAt IS NULL)
 * - idx_video_analytics_video_viewed COMPOSITE (video_id, viewed_at DESC)
 * - idx_video_analytics_user_viewed COMPOSITE (user_id, viewed_at DESC)
 * - idx_video_analytics_chapters GIN (WHERE deletedAt IS NULL)
 *
 * Business Logic:
 *
 * WHY Track Individual Views?
 * - NASM compliance: Trainers need proof that clients watched instructional videos
 * - Liability protection: Audit trail shows client education on proper form
 * - Content optimization: Identify which videos have low engagement
 * - Workout adherence: Link video views to assigned workout plans
 *
 * WHY Chapter Tracking?
 * - UX insights: Identify most-replayed sections (confusing content)
 * - Content pruning: Chapters no one watches can be removed
 * - Future feature: "Skip to most important chapter" based on analytics
 *
 * WHY Soft Deletes?
 * - Compliance: NASM requires historical audit trail (can't delete view records)
 * - Analytics accuracy: Deleting views would corrupt aggregate metrics
 * - User privacy: Allows "delete my data" requests while preserving anonymized aggregates
 *
 * WHY view_context Enum?
 * - Product insights: Where do clients engage most with educational content?
 * - Feature prioritization: If most views are from workout_plan, prioritize that UX
 * - A/B testing: Compare engagement between admin_library vs client_dashboard
 *
 * Security:
 * - Admin-only access to raw analytics (API enforced via requireAdmin middleware)
 * - Aggregated metrics visible to trainers (only for their assigned clients)
 * - Soft deletes preserve audit trail (NASM compliance requirement)
 * - SQL injection prevention via parameterized queries
 * - PII protection: user_agent anonymized in aggregated reports
 *
 * Privacy Considerations:
 * - Anonymous views supported (user_id can be NULL)
 * - user_agent stored for device analytics but excluded from client-facing reports
 * - Soft deletes allow "right to be forgotten" by setting deletedAt + anonymizing user_id
 *
 * Performance Considerations:
 * - Composite indexes optimize common admin queries (video engagement over time)
 * - GIN index on chapters_viewed enables fast "which chapters are most replayed" queries
 * - Soft delete WHERE clauses prevent scanning deleted records
 * - viewed_at DESC index enables fast "recent views" queries
 *
 * Dependencies:
 * - exercise_videos table (parent - must exist first)
 * - users table (for viewer tracking)
 *
 * Created: 2025-11-13
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
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
