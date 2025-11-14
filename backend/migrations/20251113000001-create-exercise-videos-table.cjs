/**
 * Migration: Create exercise_videos table
 * ========================================
 *
 * Purpose: Store video content for exercise demonstrations (YouTube + uploads)
 *
 * Blueprint Reference: docs/ai-workflow/AI-HANDOFF/VIDEO-LIBRARY-COMPLETE-STATUS.md
 *
 * Table Relationships (ER Diagram):
 *
 *   users (one)                    exercise_library (PARENT)
 *     │                                    │
 *     │                                    │
 *     │ (uploads)                          │ (has many)
 *     │                                    │
 *     ▼                                    ▼
 *   ┌─────────────────────────────────────────────────────┐
 *   │ exercise_videos (CHILD - Many-to-One)               │
 *   ├─────────────────────────────────────────────────────┤
 *   │ id (UUID) PK - Unique video identifier              │
 *   │ exercise_id (UUID) FK → exercise_library.id         │
 *   │ uploader_id (INTEGER) FK → users.id (SET NULL)      │
 *   │ video_type ENUM('youtube', 'upload')                │
 *   │ video_id VARCHAR(200) - YouTube ID or S3 key        │
 *   │ title VARCHAR(200) - Auto-fetched from YouTube      │
 *   │ description TEXT - Full description                 │
 *   │ duration_seconds INTEGER - Required for chapters    │
 *   │ thumbnail_url VARCHAR(500) - Preview image          │
 *   │ hls_manifest_url VARCHAR(500) - HLS .m3u8 URL       │
 *   │ hls_variants JSONB - Quality levels (360p-1080p)    │
 *   │ chapters JSONB - Timestamped navigation             │
 *   │ approved BOOLEAN - Admin approval status            │
 *   │ approved_by INTEGER FK → users.id                   │
 *   │ approved_at TIMESTAMP - Approval timestamp          │
 *   │ is_public BOOLEAN - Visibility control              │
 *   │ views INTEGER - View count (incremented on play)    │
 *   │ tags JSONB - Search/filter tags                     │
 *   │ deletedAt TIMESTAMP - Soft delete (NULL = active)   │
 *   │ created_at, updated_at TIMESTAMP                    │
 *   └─────────────────────────────────────────────────────┘
 *                     │
 *                     │ (has many)
 *                     ▼
 *   ┌─────────────────────────────────────────────────────┐
 *   │ video_analytics (One-to-Many)                       │
 *   ├─────────────────────────────────────────────────────┤
 *   │ video_id (UUID) FK → exercise_videos.id             │
 *   │ user_id (INTEGER) FK → users.id                     │
 *   │ watch_duration_seconds INTEGER                      │
 *   │ completion_percentage DECIMAL(5,2)                  │
 *   └─────────────────────────────────────────────────────┘
 *
 * Key Features:
 * - ✅ Dual video source support (YouTube Data API v3 + direct uploads)
 * - ✅ HLS adaptive bitrate streaming (upload videos only)
 * - ✅ Chapter navigation (timestamped bookmarks)
 * - ✅ Admin approval workflow (approved, approved_by, approved_at)
 * - ✅ Public/private visibility control
 * - ✅ View tracking (views count incremented on play)
 * - ✅ Soft deletes (preserves workout history)
 * - ✅ Tags for search/filtering (GIN indexed)
 *
 * Data Flow:
 *
 * YouTube Video Creation:
 * 1. Admin submits YouTube URL
 * 2. Backend fetches metadata from YouTube Data API v3
 * 3. Auto-populates: title, description, thumbnail_url, duration_seconds
 * 4. Creates exercise_videos record
 * 5. Trigger updates exercise_library.video_count
 *
 * Upload Video Creation:
 * 1. Admin uploads video file
 * 2. FFmpeg converts to HLS format (multiple quality variants)
 * 3. Uploads to S3/CloudFront
 * 4. Creates exercise_videos record with HLS manifest URL
 * 5. Trigger updates exercise_library.video_count
 *
 * Indexes (9 total):
 * - idx_exercise_videos_exercise_id (WHERE deletedAt IS NULL)
 * - idx_exercise_videos_uploader_id (WHERE deletedAt IS NULL)
 * - idx_exercise_videos_video_type (WHERE deletedAt IS NULL)
 * - idx_exercise_videos_approved (WHERE deletedAt IS NULL)
 * - idx_exercise_videos_is_public (WHERE deletedAt IS NULL)
 * - idx_exercise_videos_created_at DESC (WHERE deletedAt IS NULL)
 * - idx_exercise_videos_views DESC (WHERE deletedAt IS NULL)
 * - idx_exercise_videos_tags GIN (WHERE deletedAt IS NULL)
 * - idx_exercise_videos_active_public COMPOSITE (exercise_id, approved, is_public)
 *
 * Business Logic:
 *
 * WHY Soft Deletes?
 * - Workout history: Clients' past workouts reference these videos
 * - Compliance: NASM requires exercise history for liability
 * - Recovery: Admins can restore accidentally deleted content
 *
 * WHY Approval Workflow?
 * - Quality control: Ensures videos meet NASM standards
 * - Trainer submissions: Allows trainers to submit videos for admin review
 * - Content moderation: Prevents inappropriate content
 *
 * WHY HLS Streaming?
 * - Adaptive bitrate: Quality adjusts to user's internet speed
 * - Mobile support: Works on all devices
 * - Performance: Reduces buffering
 *
 * Security:
 * - Admin-only write access (enforced in API layer via requireAdmin middleware)
 * - Public read access for approved + public videos
 * - Soft deletes preserve audit trail
 * - SQL injection prevention via parameterized queries
 * - YouTube quota tracking (10,000 units/day)
 *
 * Dependencies:
 * - exercise_library table (parent - must exist first)
 * - users table (for uploader tracking)
 *
 * Created: 2025-11-13
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

exports.up = async function(knex) {
  // Check if table already exists
  const exists = await knex.schema.hasTable('exercise_videos');
  if (exists) {
    console.log('⏭️  Table exercise_videos already exists, skipping...');
    return;
  }

  console.log('📹 Creating exercise_videos table...');

  await knex.schema.createTable('exercise_videos', table => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Foreign keys
    table.uuid('exercise_id')
      .notNullable()
      .references('id')
      .inTable('exercise_library')
      .onDelete('CASCADE')
      .comment('Parent exercise (one exercise can have multiple video demonstrations)');

    table.uuid('uploader_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('User who uploaded/added this video (NULL if system-added)');

    // Video source info
    table.enu('video_type', ['youtube', 'upload'], { useNative: true, enumName: 'video_type_enum' })
      .notNullable()
      .comment('Source type: youtube (YouTube Data API) or upload (direct file upload)');

    table.string('video_id', 200)
      .notNullable()
      .comment('YouTube video ID (if type=youtube) or S3/storage key (if type=upload)');

    // Video metadata
    table.string('title', 200)
      .notNullable()
      .comment('Video title (auto-fetched for YouTube, manual for uploads)');

    table.text('description')
      .nullable()
      .comment('Full video description (optional)');

    table.integer('duration_seconds')
      .notNullable()
      .comment('Video duration in seconds (required for chapter navigation)');

    table.string('thumbnail_url', 500)
      .nullable()
      .comment('Thumbnail URL (auto-fetched for YouTube, generated for uploads)');

    // Upload-specific fields (NULL for YouTube videos)
    table.string('hls_manifest_url', 500)
      .nullable()
      .comment('HLS .m3u8 manifest URL for adaptive bitrate streaming (upload videos only)');

    table.jsonb('hls_variants')
      .nullable()
      .comment('HLS quality variants (360p, 480p, 720p, 1080p) with bandwidth info (upload videos only)');

    table.string('original_filename', 300)
      .nullable()
      .comment('Original uploaded filename (upload videos only)');

    table.bigInteger('file_size_bytes')
      .nullable()
      .comment('File size in bytes (upload videos only)');

    // Chapter navigation (JSONB for flexibility)
    table.jsonb('chapters')
      .nullable()
      .comment('Array of {timestamp: 15, title: "Setup", description: "..."} for video chapters');

    // Approval workflow
    table.boolean('approved')
      .notNullable()
      .defaultTo(true)
      .comment('Admin approval status (false = pending review, true = approved for public use)');

    table.uuid('approved_by')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL')
      .comment('Admin who approved this video (NULL if auto-approved)');

    table.timestamp('approved_at')
      .nullable()
      .comment('Timestamp when video was approved');

    // Visibility
    table.boolean('is_public')
      .notNullable()
      .defaultTo(true)
      .comment('Public visibility (false = admin/trainer only, true = visible to all clients)');

    // Analytics
    table.integer('views')
      .notNullable()
      .defaultTo(0)
      .comment('Total view count (incremented on video play)');

    // Tags (JSONB for flexibility)
    table.jsonb('tags')
      .nullable()
      .comment('Array of string tags for search/filtering (e.g., ["beginner", "no-equipment"])');

    // Soft deletes (CRITICAL: Preserve audit trail)
    table.timestamp('deletedAt')
      .nullable()
      .comment('Soft delete timestamp (NULL = active, non-NULL = deleted). Videos are never hard-deleted to preserve workout history.');

    // Timestamps
    table.timestamps(true, true); // created_at, updated_at
  });

  // Create indexes for performance
  await knex.schema.raw(`
    CREATE INDEX idx_exercise_videos_exercise_id ON exercise_videos(exercise_id) WHERE deletedAt IS NULL;
    CREATE INDEX idx_exercise_videos_uploader_id ON exercise_videos(uploader_id) WHERE deletedAt IS NULL;
    CREATE INDEX idx_exercise_videos_video_type ON exercise_videos(video_type) WHERE deletedAt IS NULL;
    CREATE INDEX idx_exercise_videos_approved ON exercise_videos(approved) WHERE deletedAt IS NULL;
    CREATE INDEX idx_exercise_videos_is_public ON exercise_videos(is_public) WHERE deletedAt IS NULL;
    CREATE INDEX idx_exercise_videos_created_at ON exercise_videos(created_at DESC) WHERE deletedAt IS NULL;
    CREATE INDEX idx_exercise_videos_views ON exercise_videos(views DESC) WHERE deletedAt IS NULL;

    -- GIN index for JSONB tags search
    CREATE INDEX idx_exercise_videos_tags ON exercise_videos USING GIN (tags) WHERE deletedAt IS NULL;

    -- Composite index for common query (approved + public videos for an exercise)
    CREATE INDEX idx_exercise_videos_active_public ON exercise_videos(exercise_id, approved, is_public)
      WHERE deletedAt IS NULL AND approved = true AND is_public = true;
  `);

  console.log('✅ exercise_videos table created with soft deletes and security indexes');
};

exports.down = async function(knex) {
  console.log('🗑️  Dropping exercise_videos table...');
  await knex.schema.dropTableIfExists('exercise_videos');
  await knex.raw('DROP TYPE IF EXISTS video_type_enum;');
  console.log('✅ exercise_videos table dropped');
};
