/**
 * Exercise Videos Table Migration
 * ==============================
 * 
 * Purpose: Create table for storing exercise video metadata (YouTube + uploads)
 * 
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md
 * 
 * Database ERD:
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ exercise_videos                                                  │
 * ├──────────────────────────────────────────────────────────────────┤
 * │ PK uuid id                                                      │
 * │ FK uuid exercise_id → exercise_library.id                      │
 * │   varchar video_type ('youtube'|'upload')                       │
 * │   varchar video_id (YouTube ID or S3 key)                      │
 * │   varchar title                                                 │
 * │   text description                                              │
 * │   int duration_seconds                                          │
 * │   varchar thumbnail_url                                         │
 * │   varchar hls_manifest_url                                      │
 * │   jsonb chapters [{time: 45, title: "Common Mistakes"}]       │
 * │ FK uuid uploader_id → users.id                                  │
 * │   boolean approved (default: false)                            │
 * │   int views (default: 0)                                       │
 * │   jsonb tags {equipment: ["kettlebell"], muscles: ["glutes"]}   │
 * │   timestamptz created_at                                        │
 * │   timestamptz updated_at                                        │
 * └──────────────────────────────────────────────────────────────────┘
 * 
 * Relationships:
 * - Belongs to exercise_library (many-to-one)
 * - Has many video_analytics (one-to-many)
 * 
 * Indexes:
 * - CREATE INDEX idx_exercise_videos_exercise_id ON exercise_videos(exercise_id)
 * - CREATE INDEX idx_exercise_videos_video_type ON exercise_videos(video_type)
 * - CREATE INDEX idx_exercise_videos_uploader_id ON exercise_videos(uploader_id)
 * 
 * Business Logic:
 * WHY Soft Deletes?
 * - Maintain exercise-video relationships even if exercise is deleted
 * - Preserve analytics history
 * - Allow recovery of accidentally deleted videos
 * 
 * Performance Considerations:
 * - Video listing queries will filter by exercise_id frequently
 * - Views counter will be updated frequently (hot column)
 */

exports.up = async function(queryInterface, Sequelize) {
  await queryInterface.createTable('exercise_videos', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.literal('gen_random_uuid()'),
      primaryKey: true,
      allowNull: false
    },
    exercise_id: {
      type: Sequelize.UUID,
      references: {
        model: 'exercise_library',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    video_type: {
      type: Sequelize.STRING,
      allowNull: false
    },
    video_id: {
      type: Sequelize.STRING,
      allowNull: false
    },
    title: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT
    },
    duration_seconds: {
      type: Sequelize.INTEGER
    },
    thumbnail_url: {
      type: Sequelize.STRING
    },
    hls_manifest_url: {
      type: Sequelize.STRING
    },
    chapters: {
      type: Sequelize.JSONB
    },
    uploader_id: {
      type: Sequelize.UUID,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    approved: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    views: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    tags: {
      type: Sequelize.JSONB
    },
    deletedAt: {
      type: Sequelize.DATE,
      allowNull: true
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

  await queryInterface.addIndex('exercise_videos', ['exercise_id'], { name: 'idx_exercise_videos_exercise_id' });
  await queryInterface.addIndex('exercise_videos', ['video_type'], { name: 'idx_exercise_videos_video_type' });
  await queryInterface.addIndex('exercise_videos', ['uploader_id'], { name: 'idx_exercise_videos_uploader_id' });
};

exports.down = async function(queryInterface, Sequelize) {
  await queryInterface.dropTable('exercise_videos');
};