/**
 * Badges Table Migration (Custom Admin-Created Achievement System)
 * =================================================================
 *
 * Purpose: Creates the Badges table for admin-created custom achievements with
 * image uploads, flexible criteria, and collection grouping
 *
 * Blueprint Reference: SwanStudios Unified AI Backend Implementation Plan v1.0
 *
 * Migration Date: 2026-01-04
 *
 * Table Created: Badges
 *
 * Database ERD:
 * ```
 *      ┌──────────────────────┐                    ┌──────────────────────┐
 *      │ BadgeCollections     │◄───────────────────│ Badges               │
 *      │   (UUID)             │  (collectionId FK) │   (UUID)              │
 *      └──────────────────────┘                    └──────┬───────────────┘
 *                                                        │
 *                                                        │ (badgeId)
 *                                                        │
 *      ┌──────────────────────┐                    ┌──────▼───────────────┐
 *      │ Challenges           │◄───────────────────│ UserBadges           │
 *      │   (UUID)             │  (rewardBadgeId FK)│   (UUID)              │
 *      └──────────────────────┘                    └──────────────────────┘
 * ```
 *
 * Badge Types:
 * - exercise_completion: Complete specific exercises
 * - streak_achievement: Maintain workout streaks
 * - challenge_completion: Complete admin-created challenges
 * - social_engagement: Friend referrals, high-fives
 * - milestone_reached: Level ups, session counts
 * - custom_criteria: JSON-defined flexible rules
 *
 * Data Flow (Badge Creation & Awarding):
 * ```
 * 1. ADMIN CREATES BADGE:
 *    POST /api/badges → validate criteria → upload image → save badge
 *
 * 2. USER EARNS BADGE:
 *    user action → check badge criteria → award badge → update profile
 *
 * 3. BADGE DISPLAY:
 *    user profile → load earned badges → show in collections
 * ```
 *
 * Indexes (4 total):
 * - collectionId: Fast collection filtering
 * - isActive: Active badge queries
 * - createdAt: Recent badges sorting
 * - criteriaType: Criteria-based filtering
 *
 * Business Logic:
 *
 * WHY collectionId Foreign Key?
 * - Group related badges (Strength Mastery, Cardio Champions)
 * - Collection-based achievements (unlock all in collection)
 * - Admin organization and management
 * - SET NULL on delete (preserve badges if collection removed)
 *
 * WHY criteria JSON Field?
 * - Flexible badge earning rules (exercise combos, time windows)
 * - Example: {"exercises": ["squat", "deadlift"], "within_days": 7}
 * - Extensible without schema changes
 * - Complex multi-condition logic
 *
 * WHY reward JSON Field?
 * - Multiple reward types (points, titles, customizations)
 * - Example: {"points": 500, "title": "Squat Master", "frame": "gold"}
 * - Flexible reward system expansion
 * - Admin-configurable rewards
 *
 * WHY imageUrl Separate from CDN Logic?
 * - Store final CDN URL for fast loading
 * - Support different CDN providers
 * - Enable image optimization variants
 * - Cache-friendly URL structure
 *
 * Security Model:
 * - Admin-only creation (badge manipulation prevention)
 * - Public read access (badge catalog browsing)
 * - User-specific ownership tracking
 * - Image upload validation and malware scanning
 *
 * Performance Considerations:
 * - 4 indexes for common queries
 * - JSON fields for flexible criteria (indexed where needed)
 * - CDN image URLs for global distribution
 * - Badge ownership caching for profile loads
 *
 * Rollback Strategy:
 * - DROP TABLE Badges (user_badges will be orphaned - drop that first)
 *
 * Dependencies:
 * - BadgeCollections table (optional FK for grouping)
 * - Users table (admin creator tracking)
 * - Challenges table (optional FK for challenge rewards)
 *
 * Created: 2026-01-04
 * Part of: Phase 1 Gamification Foundation
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Badges', {
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
        len: [10, 1000] // 10-1000 characters
      }
    },
    category: {
      type: Sequelize.ENUM('strength', 'cardio', 'skill', 'flexibility', 'endurance', 'general'),
      allowNull: false,
      defaultValue: 'general'
    },
    difficulty: {
      type: Sequelize.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
      allowNull: false,
      defaultValue: 'beginner'
    },
    imageUrl: {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    criteriaType: {
      type: Sequelize.ENUM(
        'exercise_completion',
        'streak_achievement',
        'challenge_completion',
        'social_engagement',
        'milestone_reached',
        'custom_criteria'
      ),
      allowNull: false
    },
    criteria: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {},
      comment: 'Flexible criteria definition (exercise IDs, counts, timeframes, etc.)'
    },
    rewards: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: { points: 100 },
      comment: 'Reward structure (points, titles, customizations, etc.)'
    },
    collectionId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'BadgeCollections',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional grouping into collections'
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
      comment: 'Admin who created this badge'
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
  await queryInterface.addIndex('Badges', ['collectionId']);
  await queryInterface.addIndex('Badges', ['isActive']);
  await queryInterface.addIndex('Badges', ['createdAt']);
  await queryInterface.addIndex('Badges', ['criteriaType']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('Badges');
}