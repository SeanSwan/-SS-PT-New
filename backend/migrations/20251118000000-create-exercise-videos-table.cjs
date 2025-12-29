'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              EXERCISE VIDEOS TABLE MIGRATION (Sequelize)                 ║
 * ║      (YouTube + Upload Video Metadata for Exercise Library)             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Create table for storing exercise video metadata (YouTube + uploads)
 *
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      DATABASE ERD - EXERCISE VIDEOS                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * exercise_videos Table:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Table: exercise_videos                                                   │
 * ├──────────────────────┬───────────────────────────────────────────────────┤
 * │ id                   │ UUID (PK, gen_random_uuid())                      │
 * │ exercise_id          │ UUID (FK → exercise_library.id) CASCADE           │
 * │ video_type           │ VARCHAR - 'youtube' or 'upload'                   │
 * │ video_id             │ VARCHAR - YouTube ID or S3 key                    │
 * │ title                │ VARCHAR - Video title                             │
 * │ description          │ TEXT - Video description                          │
 * │ duration_seconds     │ INTEGER - Video duration in seconds              │
 * │ thumbnail_url        │ VARCHAR - Video thumbnail URL                     │
 * │ hls_manifest_url     │ VARCHAR - HLS streaming manifest URL              │
 * │ chapters             │ JSONB - [{time: 45, title: "Common Mistakes"}]   │
 * │ uploader_id          │ INTEGER (FK → Users.id) SET NULL                  │
 * │ approved             │ BOOLEAN - Video approval status (default: false) │
 * │ views                │ INTEGER - View count (default: 0)                │
 * │ tags                 │ JSONB - {equipment: ["kettlebell"], muscles: []} │
 * │ deletedAt            │ TIMESTAMP - Soft delete timestamp                 │
 * │ created_at           │ TIMESTAMP (Auto-managed)                         │
 * │ updated_at           │ TIMESTAMP (Auto-managed)                         │
 * └──────────────────────┴───────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         RELATIONSHIPS                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Belongs to exercise_library (many-to-one):
 * - Each video is associated with one exercise
 * - ON DELETE CASCADE: When exercise is deleted, all videos are deleted
 * - ON UPDATE CASCADE: When exercise ID changes, video FK updates
 *
 * Belongs to Users (many-to-one):
 * - Each video has one uploader (admin/trainer)
 * - ON DELETE SET NULL: When user is deleted, preserve video but clear uploader
 * - ON UPDATE CASCADE: When user ID changes, video FK updates
 *
 * Has many video_analytics (one-to-many):
 * - Each video can have multiple analytics records
 * - Tracks views, completion, engagement metrics
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     INDEXES & CONSTRAINTS                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * B-tree Indexes (Fast Equality/Range Queries):
 * 1. idx_exercise_videos_exercise_id - INDEX (exercise_id)
 *    - Fast lookup of all videos for an exercise
 *    - Most common query: "Show all videos for Barbell Squat"
 * 2. idx_exercise_videos_video_type - INDEX (video_type)
 *    - Filter by YouTube vs uploaded videos
 *    - Useful for reporting and admin views
 * 3. idx_exercise_videos_uploader_id - INDEX (uploader_id)
 *    - Track videos uploaded by specific admin/trainer
 *    - Useful for content creator analytics
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Soft Deletes (deletedAt)?
 * - Maintain exercise-video relationships even if exercise is deleted
 * - Preserve analytics history for reporting
 * - Allow recovery of accidentally deleted videos
 * - Audit trail: "Who deleted what video and when?"
 * - Query pattern: WHERE deletedAt IS NULL (active videos only)
 *
 * WHY video_type ENUM ('youtube'|'upload')?
 * - Dual video source support: YouTube embeds + S3 uploads
 * - YouTube videos: Free hosting, instant availability, no storage costs
 * - Upload videos: Full control, custom branding, no YouTube dependency
 * - Query pattern: WHERE video_type = 'youtube' for external sources
 *
 * WHY video_id VARCHAR (Not separate youtube_id/s3_key columns)?
 * - Flexible identifier: YouTube ID (11 chars) or S3 key (path/to/video.mp4)
 * - Single field simplifies queries: video_type + video_id = full reference
 * - Example YouTube: video_id = 'dQw4w9WgXcQ'
 * - Example Upload: video_id = 'exercises/squats/barbell-squat-demo-2024.mp4'
 *
 * WHY chapters JSONB?
 * - Video navigation: Jump to "Setup", "Execution", "Common Mistakes"
 * - Example: [
 *     { time: 0, title: "Introduction" },
 *     { time: 45, title: "Proper Setup" },
 *     { time: 120, title: "Common Mistakes" }
 *   ]
 * - Flexible schema: Can add thumbnails, descriptions per chapter
 * - GIN indexing possible if needed for chapter search
 *
 * WHY approved BOOLEAN (Default: false)?
 * - Content moderation: Admin approval before videos go live
 * - Trainer uploads: Allow trainers to submit, require admin approval
 * - Quality control: Prevent inappropriate/low-quality videos
 * - Query pattern: WHERE approved = true for client-facing views
 *
 * WHY views INTEGER (Default: 0)?
 * - Popular content tracking: "Most viewed exercise videos"
 * - Hot column: Updated frequently (potential performance consideration)
 * - Denormalized for speed: Could calculate from video_analytics but slower
 * - Analytics: Identify valuable content for clients
 *
 * WHY tags JSONB?
 * - Flexible metadata: equipment, muscles, difficulty, video style
 * - Example: { equipment: ["kettlebell"], muscles: ["glutes"], style: "beginner" }
 * - Search/filter: "Show all kettlebell exercise videos"
 * - No schema changes needed when adding new tag categories
 * - GIN index possible for fast tag-based queries
 *
 * WHY uploader_id FK to Users (Not separate admin/trainer tables)?
 * - Single user system: All users in Users table with role field
 * - SET NULL on delete: Preserve video even if uploader account deleted
 * - Attribution: "Video uploaded by John Doe (Trainer)"
 * - Access control: Only admin/trainer roles can upload
 * - CRITICAL: Users.id is INTEGER, not UUID!
 *
 * WHY hls_manifest_url VARCHAR?
 * - Adaptive streaming support: HLS for mobile/desktop
 * - Upload videos only: YouTube handles streaming natively
 * - Example: 'https://cdn.example.com/videos/squat-demo/master.m3u8'
 * - Quality switching: 720p, 1080p based on bandwidth
 * - Mobile-friendly: Efficient video delivery
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        DATA FLOW DIAGRAM                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Video Upload Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. ADMIN ADDS YOUTUBE VIDEO                                             │
 * │    POST /admin/exercise-library/:exerciseId/video                        │
 * │      { video_type: 'youtube', video_id: 'dQw4w9WgXcQ' }                 │
 * │    ↓                                                                     │
 * │    Fetch YouTube metadata (title, duration, thumbnail)                  │
 * │    ↓                                                                     │
 * │    INSERT INTO exercise_videos (                                        │
 * │      exercise_id, video_type='youtube', video_id,                       │
 * │      title, duration_seconds, thumbnail_url, approved=true              │
 * │    )                                                                    │
 * │                                                                          │
 * │ 2. TRAINER UPLOADS VIDEO FILE                                           │
 * │    POST /admin/exercise-library/:exerciseId/upload-video                │
 * │      (multipart/form-data with video file)                              │
 * │    ↓                                                                     │
 * │    Upload to S3: exercises/{exerciseId}/{uuid}.mp4                      │
 * │    ↓                                                                     │
 * │    Process video: Generate thumbnail, extract duration, create HLS      │
 * │    ↓                                                                     │
 * │    INSERT INTO exercise_videos (                                        │
 * │      exercise_id, video_type='upload',                                  │
 * │      video_id='exercises/uuid.mp4', uploader_id,                        │
 * │      approved=false  // Requires admin approval                         │
 * │    )                                                                    │
 * │                                                                          │
 * │ 3. CLIENT WATCHES VIDEO                                                 │
 * │    GET /exercise-library/:id/videos                                     │
 * │    ↓                                                                     │
 * │    SELECT * FROM exercise_videos WHERE                                  │
 * │      exercise_id = :id AND approved = true AND deletedAt IS NULL        │
 * │    ↓                                                                     │
 * │    Returns: Video list with YouTube embeds or S3 signed URLs            │
 * │    ↓                                                                     │
 * │    Client plays video → Track analytics in video_analytics table        │
 * │    ↓                                                                     │
 * │    Increment views: UPDATE exercise_videos SET views = views + 1        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      PERFORMANCE CONSIDERATIONS                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Video listing queries will filter by exercise_id frequently (indexed)
 * - Views counter will be updated frequently (hot column, potential bottleneck)
 * - Consider denormalizing view counts or using Redis for caching
 * - Approved filter used in all client-facing queries (consider partial index)
 * - deletedAt filter used in all queries (indexed in reference migration)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      SECURITY CONSIDERATIONS                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Admin-only writes: Only role='admin' can CREATE/UPDATE/DELETE videos
 * - Trainer uploads: Trainers can upload but require admin approval
 * - Client read access: Clients can only view approved videos
 * - S3 signed URLs: Upload videos use temporary signed URLs (security)
 * - YouTube validation: Validate YouTube video IDs before insert
 * - Content moderation: approved=false until admin reviews
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Idempotent design: showAllTables() check prevents duplicate creation
 * - Transaction wrapped: All operations commit/rollback together
 * - Safe for production: CREATE TABLE is non-destructive
 * - Foreign keys: CASCADE on exercise delete, SET NULL on user delete
 * - Indexes created after table for optimal performance
 * - No data loss: New table, no existing data to migrate
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - exercise_library table (parent, FK dependency)
 * - Users table (parent, FK dependency)
 *
 * Related Code:
 * - backend/models/ExerciseVideo.mjs (Sequelize model)
 * - backend/controllers/videoLibraryController.mjs (CRUD operations)
 * - backend/routes/videoLibraryRoutes.mjs (API endpoints)
 * - backend/services/youtubeValidationService.mjs (YouTube API integration)
 * - backend/services/s3UploadService.mjs (S3 upload handling)
 * - frontend/src/pages/Admin/VideoLibrary.tsx (Admin video management)
 * - frontend/src/components/VideoPlayer.tsx (Video playback)
 *
 * Related Migrations:
 * - 20251113000000-create-exercise-library-table.cjs (parent table)
 * - 20251113000002-create-video-analytics-table.cjs (child table, 1:M relationship)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if table already exists
      const tables = await queryInterface.showAllTables();
      if (tables.includes('exercise_videos')) {
        console.log('⏭️  Table exercise_videos already exists, skipping...');
        await transaction.commit();
        return;
      }

      console.log('🎥 Creating exercise_videos table (Video Library)...');

      // Create Table
      await queryInterface.createTable('exercise_videos', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        exercise_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'exercise_library',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'FK to exercise_library.id (UUID)'
        },
        video_type: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Video source type: "youtube" or "upload"'
        },
        video_id: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'YouTube video ID or S3 object key'
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'Video title'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Video description'
        },
        duration_seconds: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Video duration in seconds'
        },
        thumbnail_url: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Video thumbnail URL'
        },
        hls_manifest_url: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'HLS streaming manifest URL (for uploaded videos)'
        },
        chapters: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: 'Video chapters: [{time: 45, title: "Common Mistakes"}]'
        },
        uploader_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'FK to Users.id (INTEGER) - admin/trainer who uploaded video'
        },
        approved: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Video approval status (default: false, requires admin approval)'
        },
        views: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Video view count (denormalized for performance)'
        },
        tags: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment: 'Flexible metadata: {equipment: ["kettlebell"], muscles: ["glutes"]}'
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Soft delete timestamp (NULL = active). Videos never hard-deleted to preserve analytics.'
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, { transaction });

      // Create B-tree indexes
      console.log('📇 Creating indexes for exercise_videos...');

      await queryInterface.addIndex('exercise_videos', ['exercise_id'], {
        name: 'idx_exercise_videos_exercise_id',
        transaction
      });

      await queryInterface.addIndex('exercise_videos', ['video_type'], {
        name: 'idx_exercise_videos_video_type',
        transaction
      });

      await queryInterface.addIndex('exercise_videos', ['uploader_id'], {
        name: 'idx_exercise_videos_uploader_id',
        transaction
      });

      console.log('✅ exercise_videos table created successfully');
      console.log('   Ready for YouTube and upload video management!');

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('🗑️  Dropping exercise_videos table...');

      await queryInterface.dropTable('exercise_videos', { transaction });

      console.log('✅ exercise_videos table dropped');
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
