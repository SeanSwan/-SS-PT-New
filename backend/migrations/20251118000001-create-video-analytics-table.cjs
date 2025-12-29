'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            VIDEO ANALYTICS TABLE MIGRATION (Sequelize)                   ║
 * ║      (Track Video Views, Engagement, and Completion Metrics)             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Track video views and engagement metrics for exercise videos
 *
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                   DATABASE ERD - VIDEO ANALYTICS                         │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * video_analytics Table:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Table: video_analytics                                                   │
 * ├──────────────────────┬───────────────────────────────────────────────────┤
 * │ id                   │ UUID (PK, gen_random_uuid())                      │
 * │ video_id             │ UUID (FK → exercise_videos.id) CASCADE            │
 * │ user_id              │ INTEGER (FK → Users.id) SET NULL                  │
 * │ watched_duration_seconds │ INTEGER - Seconds watched                     │
 * │ completion_percentage│ DECIMAL(5,2) - % of video completed              │
 * │ watched_at           │ TIMESTAMP - When video was watched                │
 * │ completed            │ BOOLEAN - Full video completed (default: false)  │
 * │ chapters_viewed      │ JSONB - Array of chapter timestamps viewed        │
 * │ replay_count         │ INTEGER - Number of replays (default: 0)         │
 * │ pause_count          │ INTEGER - Number of pauses (default: 0)          │
 * │ session_id           │ VARCHAR - Unique session identifier               │
 * │ device_type          │ VARCHAR - Device type (mobile, tablet, desktop)  │
 * │ user_agent           │ VARCHAR - Browser user agent string               │
 * │ view_context         │ VARCHAR - Context (workout, library, search)     │
 * │ workout_id           │ UUID - Associated workout (if applicable)         │
 * │ viewed_at            │ TIMESTAMP - Alias/duplicate for watched_at        │
 * │ created_at           │ TIMESTAMP (Auto-managed)                         │
 * │ updated_at           │ TIMESTAMP (Auto-managed)                         │
 * └──────────────────────┴───────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         RELATIONSHIPS                                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Belongs to exercise_videos (many-to-one):
 * - Each analytics record tracks one video view
 * - ON DELETE CASCADE: When video is deleted, analytics are deleted
 * - ON UPDATE CASCADE: When video ID changes, analytics FK updates
 *
 * Belongs to Users (many-to-one):
 * - Each view is associated with one user (client/trainer)
 * - ON DELETE SET NULL: When user is deleted, preserve analytics but clear user_id
 * - ON UPDATE CASCADE: When user ID changes, analytics FK updates
 * - CRITICAL: Users.id is INTEGER, not UUID!
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     INDEXES & CONSTRAINTS                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * B-tree Indexes (Fast Equality/Range Queries):
 * 1. idx_video_analytics_video_id - INDEX (video_id)
 *    - Fast lookup of all analytics for a video
 *    - Most common query: "Show analytics for this video"
 *    - Used for aggregate queries: "Total views, avg completion %"
 * 2. idx_video_analytics_user_id - INDEX (user_id)
 *    - Track user viewing history
 *    - Useful for recommendations: "Videos you haven't watched"
 * 3. idx_video_analytics_watched_at - INDEX (watched_at)
 *    - Time-based reporting: "Views in last 30 days"
 *    - Trend analysis: "Video views over time"
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Track Completion Percentage?
 * - Identify which parts of videos users watch/re-watch
 * - Detect common drop-off points (e.g., 30% of users stop at 2:30)
 * - Measure engagement with different video styles (demo vs tutorial)
 * - Example: completion_percentage = 85.5 (watched 85.5% of video)
 * - Use case: "90% of users skip the intro, start at 0:45"
 *
 * WHY watched_duration_seconds INTEGER?
 * - Track actual watch time vs video duration
 * - Example: 180-second video, user watched 154 seconds (85.5%)
 * - Aggregation: "Total hours of video content consumed"
 * - Engagement metric: "Average watch duration per video"
 *
 * WHY completed BOOLEAN?
 * - Fast filter for full completions vs partial views
 * - Example: WHERE completed = true for completion rate calculations
 * - Achievement system: "Watched all videos for Squat variations"
 * - Denormalized for speed: Could derive from completion_percentage >= 95
 *
 * WHY chapters_viewed JSONB?
 * - Track which chapters users interact with
 * - Example: [0, 45, 120] (user watched intro, setup, mistakes chapters)
 * - Analytics: "Chapter 3 (Common Mistakes) most re-watched"
 * - Skip detection: "80% of users skip Chapter 1 (Intro)"
 *
 * WHY replay_count INTEGER?
 * - Measure video value: High replay = valuable content
 * - Example: replay_count = 5 (user watched video 5 times)
 * - Quality signal: "Videos with avg replay_count > 2 are high-quality"
 * - Recommendation: "You watched this 3 times, here are similar videos"
 *
 * WHY pause_count INTEGER?
 * - Engagement metric: Pausing to take notes = high engagement
 * - Example: pause_count = 12 (user paused frequently to practice)
 * - Tutorial effectiveness: "Users pause 15x during technique videos"
 * - vs passive viewing: pause_count = 0
 *
 * WHY session_id VARCHAR?
 * - Track single viewing session across page reloads
 * - Example: User watches video, pauses, reloads page, continues
 * - Prevent duplicate analytics: Same session = update existing record
 * - Session analysis: "Average session duration: 8 minutes"
 *
 * WHY device_type VARCHAR?
 * - Mobile vs desktop viewing patterns
 * - Example: device_type = 'mobile' (85% of views on mobile)
 * - Optimize for platform: "Mobile users watch shorter videos"
 * - Responsive design: "Desktop users prefer longer tutorials"
 *
 * WHY user_agent VARCHAR?
 * - Browser/app tracking for compatibility issues
 * - Example: user_agent = 'Mozilla/5.0 (iPhone; CPU iPhone OS...'
 * - Debugging: "Video playback issues on Safari iOS 14"
 * - Platform analytics: "Chrome users watch 2x more videos"
 *
 * WHY view_context VARCHAR?
 * - Understand where users watch videos
 * - Example: view_context = 'workout' (watched during workout session)
 * - vs 'library' (browsing exercise library) or 'search' (searched for squat)
 * - Engagement: "Videos watched in workouts have 90% completion rate"
 * - vs "Videos in library browsing have 40% completion rate"
 *
 * WHY workout_id UUID?
 * - Link video views to specific workout sessions
 * - Example: workout_id = 'uuid-123' (watched during Leg Day workout)
 * - Analytics: "Users who watch videos during workouts complete 2x more sets"
 * - Recommendations: "Videos from your last workout"
 *
 * WHY watched_at TIMESTAMP?
 * - Primary timestamp for when video was watched
 * - Time-based queries: "Views in last 7 days"
 * - Trend analysis: "Video views spiked after email campaign"
 * - Default: CURRENT_TIMESTAMP (auto-populated)
 *
 * WHY viewed_at TIMESTAMP (Duplicate)?
 * - Alias for watched_at (controller compatibility)
 * - Some controllers use viewed_at, some use watched_at
 * - Redundant but ensures backward compatibility
 * - TODO: Standardize to single timestamp field in future refactor
 *
 * WHY user_id FK to Users (INTEGER)?
 * - Track which users are watching videos
 * - SET NULL on delete: Preserve analytics even if user account deleted
 * - Anonymized analytics: user_id = NULL still useful for aggregate stats
 * - CRITICAL: Users.id is INTEGER, not UUID! (line 24 of User.mjs)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        DATA FLOW DIAGRAM                                 │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Video Analytics Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. CLIENT STARTS WATCHING VIDEO                                         │
 * │    POST /video-analytics/track                                          │
 * │      { video_id, user_id, session_id, device_type, view_context }       │
 * │    ↓                                                                     │
 * │    INSERT INTO video_analytics (                                        │
 * │      video_id, user_id, session_id, device_type, view_context,          │
 * │      watched_duration_seconds=0, completion_percentage=0, completed=false│
 * │    )                                                                    │
 * │    ↓                                                                     │
 * │    INCREMENT exercise_videos.views: UPDATE SET views = views + 1        │
 * │                                                                          │
 * │ 2. CLIENT WATCHES VIDEO (PERIODIC UPDATES)                              │
 * │    PUT /video-analytics/:id/update                                      │
 * │      { watched_duration_seconds: 120, completion_percentage: 66.7 }     │
 * │    ↓                                                                     │
 * │    UPDATE video_analytics SET                                           │
 * │      watched_duration_seconds=120, completion_percentage=66.7,          │
 * │      updated_at=NOW()                                                   │
 * │                                                                          │
 * │ 3. CLIENT COMPLETES VIDEO                                               │
 * │    PUT /video-analytics/:id/complete                                    │
 * │      { watched_duration_seconds: 180, completion_percentage: 100 }      │
 * │    ↓                                                                     │
 * │    UPDATE video_analytics SET                                           │
 * │      watched_duration_seconds=180, completion_percentage=100,           │
 * │      completed=true                                                     │
 * │                                                                          │
 * │ 4. ADMIN VIEWS ANALYTICS DASHBOARD                                      │
 * │    GET /admin/video-analytics/summary?video_id=uuid                     │
 * │    ↓                                                                     │
 * │    SELECT                                                               │
 * │      COUNT(*) as total_views,                                           │
 * │      AVG(completion_percentage) as avg_completion,                      │
 * │      AVG(watched_duration_seconds) as avg_watch_time,                   │
 * │      COUNT(*) FILTER(WHERE completed=true) as completions,              │
 * │      AVG(replay_count) as avg_replays                                   │
 * │    FROM video_analytics WHERE video_id = :video_id                      │
 * │    ↓                                                                     │
 * │    Returns: { total_views: 150, avg_completion: 78.5%, ... }            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      PERFORMANCE CONSIDERATIONS                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - High write volume: Every video view creates a record
 * - Frequent updates: watched_duration updates every 10-30 seconds
 * - Analytics queries filter by video_id frequently (indexed)
 * - Time-based queries use watched_at index for trend reports
 * - Consider partitioning by watched_at for large datasets (future optimization)
 * - Aggregate queries can be expensive: Consider materialized views for dashboards
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      SECURITY CONSIDERATIONS                             │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - User privacy: Only aggregate analytics shown to admins
 * - Individual user viewing history private (not shared with trainers)
 * - Anonymous analytics: SET NULL on user delete preserves aggregate stats
 * - No PII in user_agent field (just browser info)
 * - Session IDs are temporary, not linked to auth tokens
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Idempotent design: showAllTables() check prevents duplicate creation
 * - Transaction wrapped: All operations commit/rollback together
 * - Safe for production: CREATE TABLE is non-destructive
 * - Foreign keys: CASCADE on video delete, SET NULL on user delete
 * - Indexes created after table for optimal performance
 * - No data loss: New table, no existing data to migrate
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - exercise_videos table (parent, FK dependency)
 * - Users table (parent, FK dependency)
 *
 * Related Code:
 * - backend/models/VideoAnalytics.mjs (Sequelize model)
 * - backend/controllers/videoAnalyticsController.mjs (CRUD operations)
 * - backend/routes/videoAnalyticsRoutes.mjs (API endpoints)
 * - frontend/src/components/VideoPlayer.tsx (Analytics tracking)
 * - frontend/src/pages/Admin/VideoAnalyticsDashboard.tsx (Analytics dashboard)
 *
 * Related Migrations:
 * - 20251113000000-create-exercise-videos-table.cjs (parent table)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if table already exists
      const tables = await queryInterface.showAllTables();
      if (tables.includes('video_analytics')) {
        console.log('⏭️  Table video_analytics already exists, skipping...');
        await transaction.commit();
        return;
      }

      console.log('📊 Creating video_analytics table (Video Engagement Tracking)...');

      // Create Table
      await queryInterface.createTable('video_analytics', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
          allowNull: false
        },
        video_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'exercise_videos',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'FK to exercise_videos.id (UUID)'
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'FK to Users.id (INTEGER) - client/trainer who watched video'
        },
        watched_duration_seconds: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Seconds of video watched by user'
        },
        completion_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          comment: 'Percentage of video completed (0.00 - 100.00)'
        },
        watched_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Primary timestamp for when video was watched'
        },
        completed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Full video completed (true if completion_percentage >= 95)'
        },
        chapters_viewed: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: [],
          comment: 'Array of chapter timestamps viewed: [0, 45, 120]'
        },
        replay_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Number of times user replayed video'
        },
        pause_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Number of times user paused video (engagement metric)'
        },
        session_id: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Unique session identifier to track viewing session'
        },
        device_type: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Device type: mobile, tablet, desktop'
        },
        user_agent: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Browser user agent string for compatibility tracking'
        },
        view_context: {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Context where video was watched: workout, library, search'
        },
        workout_id: {
          type: Sequelize.UUID,
          allowNull: true,
          comment: 'Associated workout session (if video watched during workout)'
        },
        viewed_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Alias for watched_at (controller compatibility)'
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
      console.log('📇 Creating indexes for video_analytics...');

      await queryInterface.addIndex('video_analytics', ['video_id'], {
        name: 'idx_video_analytics_video_id',
        transaction
      });

      await queryInterface.addIndex('video_analytics', ['user_id'], {
        name: 'idx_video_analytics_user_id',
        transaction
      });

      await queryInterface.addIndex('video_analytics', ['watched_at'], {
        name: 'idx_video_analytics_watched_at',
        transaction
      });

      console.log('✅ video_analytics table created successfully');
      console.log('   Ready for video engagement tracking!');

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
      console.log('🗑️  Dropping video_analytics table...');

      await queryInterface.dropTable('video_analytics', { transaction });

      console.log('✅ video_analytics table dropped');
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
