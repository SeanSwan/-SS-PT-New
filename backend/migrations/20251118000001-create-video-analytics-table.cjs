/**
 * Video Analytics Table Migration
 * ==============================
 * 
 * Purpose: Track video views and engagement metrics
 * 
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md
 * 
 * Database ERD:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ video_analytics                                                 │
 * ├──────────────────────────────────────────────────────────────────┤
 * │ PK uuid id                                                      │
 * │ FK uuid video_id → exercise_videos.id                           │
 * │ FK uuid user_id → users.id                                      │
 * │   int watched_duration_seconds                                  │
 * │   decimal completion_percentage                                 │
 * │   timestamptz watched_at                                        │
 * └──────────────────────────────────────────────────────────────────┘
 * 
 * Relationships:
 * - Belongs to exercise_videos (many-to-one)
 * - Belongs to users (many-to-one)
 * 
 * Indexes:
 * - CREATE INDEX idx_video_analytics_video_id ON video_analytics(video_id)
 * - CREATE INDEX idx_video_analytics_user_id ON video_analytics(user_id)
 * - CREATE INDEX idx_video_analytics_watched_at ON video_analytics(watched_at)
 * 
 * Business Logic:
 * WHY Track Completion Percentage?
 * - Identify which parts of videos users watch/re-watch
 * - Detect common drop-off points
 * - Measure engagement with different video styles
 * 
 * Performance Considerations:
 * - High write volume (every view creates a record)
 * - Analytics queries will filter by video_id frequently
 * - Watched_at column used for time-based reporting
 */

exports.up = async function(queryInterface, Sequelize) {
  await queryInterface.createTable('video_analytics', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false
    },
    video_id: {
      type: Sequelize.UUID,
      references: {
        model: 'exercise_videos',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    user_id: {
      type: Sequelize.UUID,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    watched_duration_seconds: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    completion_percentage: {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false
    },
    watched_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    // Add missing columns from controller usage
    completed: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    chapters_viewed: {
      type: Sequelize.JSONB
    },
    replay_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    pause_count: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    session_id: {
      type: Sequelize.STRING
    },
    device_type: {
      type: Sequelize.STRING
    },
    user_agent: {
      type: Sequelize.STRING
    },
    view_context: {
      type: Sequelize.STRING
    },
    workout_id: {
      type: Sequelize.UUID
    },
    viewed_at: { // Alias for watched_at if needed, or just use watched_at
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    created_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updated_at: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    }
  });

  await queryInterface.addIndex('video_analytics', ['video_id'], { name: 'idx_video_analytics_video_id' });
  await queryInterface.addIndex('video_analytics', ['user_id'], { name: 'idx_video_analytics_user_id' });
  await queryInterface.addIndex('video_analytics', ['watched_at'], { name: 'idx_video_analytics_watched_at' });
};

exports.down = async function(queryInterface, Sequelize) {
  await queryInterface.dropTable('video_analytics');
};