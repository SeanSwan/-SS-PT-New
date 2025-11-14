/**
 * Migration: Create exercise_videos table
 *
 * Purpose: Store video content for exercise demonstrations (YouTube + uploads)
 * Features:
 * - Soft deletes (deletedAt timestamp)
 * - Support for both YouTube and uploaded videos
 * - HLS streaming for uploaded videos
 * - Chapter navigation
 * - View tracking
 * - Public/private visibility
 * - Admin approval workflow
 *
 * Related Tables:
 * - exercise_library (parent - one exercise has many videos)
 * - users (uploader tracking)
 *
 * Security:
 * - Admin-only write access (enforced in API layer)
 * - Public read access for approved videos
 * - Soft deletes preserve audit trail
 *
 * Created: 2025-11-13
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
