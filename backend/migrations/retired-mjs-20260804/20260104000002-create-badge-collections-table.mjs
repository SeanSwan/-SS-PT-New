/**
 * Badge Collections Table Migration (Badge Grouping System)
 * ========================================================
 *
 * Purpose: Creates the BadgeCollections table for organizing badges into themed
 * collections and series (Strength Mastery, Cardio Champions, etc.)
 *
 * Blueprint Reference: SwanStudios Unified AI Backend Implementation Plan v1.0
 *
 * Migration Date: 2026-01-04
 *
 * Table Created: BadgeCollections
 *
 * Database ERD:
 * ```
 *      ┌──────────────────────┐
 *      │ BadgeCollections     │
 *      │   (UUID)             │
 *      └──────┬───────────────┘
 *             │
 *             │ (collectionId)
 *             │
 *      ┌──────▼───────────────┐
 *      │ Badges               │
 *      │   (UUID)             │
 *      └──────────────────────┘
 * ```
 *
 * Collection Types:
 * - skill_based: Grouped by fitness skills (strength, cardio, flexibility)
 * - challenge_based: Tied to specific challenges or events
 * - seasonal: Time-limited collections (Summer Shred, Winter Warrior)
 * - achievement_series: Progressive difficulty series
 * - custom: Admin-defined custom groupings
 *
 * Data Flow (Collection Management):
 * ```
 * 1. ADMIN CREATES COLLECTION:
 *    POST /api/badge-collections → validate theme → save collection
 *
 * 2. ADMIN ADDS BADGES:
 *    PUT /api/badges/:id/collection → update badge.collectionId
 *
 * 3. USER VIEWS COLLECTION:
 *    GET /api/badge-collections/:id → load collection + badges
 *
 * 4. PROGRESS TRACKING:
 *    user profile → calculate collection completion percentage
 * ```
 *
 * Business Logic:
 *
 * WHY theme ENUM Field?
 * - Standardized collection themes for UI consistency
 * - Filter collections by type (skill-based, seasonal, etc.)
 * - Theme-based styling and icons
 * - Analytics grouping by theme
 *
 * WHY badgeCount Field?
 * - Fast collection size queries (avoid COUNT(*) joins)
 * - Progress calculation (earned/badges in collection)
 * - Collection completion badges
 * - UI display optimization
 *
 * WHY metadata JSON Field?
 * - Theme-specific configuration (colors, icons, descriptions)
 * - Seasonal dates (start_date, end_date for seasonal collections)
 * - Custom rules (completion requirements, special rewards)
 * - Extensible without schema changes
 *
 * WHY isActive Toggle?
 * - Seasonal collection management (deactivate after season)
 * - Archive old collections while preserving user progress
 * - Testing collections (draft mode)
 * - Soft delete functionality
 *
 * Security Model:
 * - Admin-only creation and management
 * - Public read access (collection browsing)
 * - Badge assignment restrictions (admin only)
 * - Collection integrity protection
 *
 * Performance Considerations:
 * - Index on isActive for active collection queries
 * - Index on theme for theme-based filtering
 * - Cached badge counts for performance
 * - Collection progress pre-calculation
 *
 * Rollback Strategy:
 * - SET NULL on badges.collectionId (preserve badges)
 * - DROP TABLE BadgeCollections
 *
 * Dependencies:
 * - Users table (createdBy admin tracking)
 * - Badges table (optional FK relationship)
 *
 * Created: 2026-01-04
 * Part of: Phase 1 Gamification Foundation
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('BadgeCollections', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        len: [3, 100] // 3-100 characters
      }
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
      validate: {
        len: [10, 500] // 10-500 characters
      }
    },
    theme: {
      type: Sequelize.ENUM(
        'skill_based',
        'challenge_based',
        'seasonal',
        'achievement_series',
        'custom'
      ),
      allowNull: false,
      defaultValue: 'custom'
    },
    badgeCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Cached count of badges in this collection'
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Theme-specific configuration and custom rules'
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdBy: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Admin who created this collection'
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false
    }
  });

  // Add indexes for performance
  await queryInterface.addIndex('BadgeCollections', ['isActive']);
  await queryInterface.addIndex('BadgeCollections', ['theme']);
  await queryInterface.addIndex('BadgeCollections', ['createdAt']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('BadgeCollections');
}