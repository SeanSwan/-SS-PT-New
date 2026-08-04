/**
 * User Badges Table Migration (Badge Ownership Tracking)
 * =====================================================
 *
 * Purpose: Creates the UserBadges table for tracking which users have earned
 * which badges, when they earned them, and earning context
 *
 * Blueprint Reference: SwanStudios Unified AI Backend Implementation Plan v1.0
 *
 * Migration Date: 2026-01-04
 *
 * Table Created: UserBadges
 *
 * Database ERD:
 * ```
 *      ┌──────────────────────┐                    ┌──────────────────────┐
 *      │ Users                │◄───────────────────│ UserBadges           │
 *      │   (UUID)             │  (userId FK)       │   (UUID)              │
 *      └──────┬───────────────┘                    └──────┬───────────────┘
 *             │                                           │
 *             │ (awardedBy)                               │ (badgeId)
 *             │                                           │
 *      ┌──────▼───────────────┐                    ┌──────▼───────────────┐
 *      │ Users                │                    │ Badges               │
 *      │   (UUID)             │                    │   (UUID)              │
 *      └──────────────────────┘                    └──────────────────────┘
 * ```
 *
 * Badge Earning Types:
 * - automatic: System-detected achievement (exercise completion, streaks)
 * - manual: Admin/trainer awarded badge
 * - challenge: Earned through challenge completion
 * - referral: Earned through friend referrals
 * - purchase: Earned through package purchases
 *
 * Data Flow (Badge Earning & Tracking):
 * ```
 * 1. USER EARNS BADGE:
 *    action triggers → badge criteria check → award badge
 *
 * 2. RECORD OWNERSHIP:
 *    INSERT UserBadges (userId, badgeId, earnedAt, context)
 *
 * 3. APPLY REWARDS:
 *    update user points → unlock title → apply customizations
 *
 * 4. PROFILE DISPLAY:
 *    user dashboard → load earned badges → show progress
 *
 * 5. ANALYTICS:
 *    badge earning trends → user engagement metrics
 * ```
 *
 * Indexes (5 total):
 * - userId: User's badge collection queries
 * - badgeId: Badge ownership statistics
 * - earnedAt: Chronological badge history
 * - earningType: Filter by earning method
 * - awardedBy: Admin awarding history
 *
 * Business Logic:
 *
 * WHY Unique Constraint on (userId, badgeId)?
 * - Prevent duplicate badge ownership
 * - One-time earning per badge (unless re-earnable)
 * - Data integrity protection
 * - Efficient ownership checking
 *
 * WHY earningContext JSON Field?
 * - Store how/why badge was earned (exercise details, challenge info)
 * - Example: {"exerciseId": "uuid", "count": 50, "dateRange": "2025-01-01 to 2025-01-31"}
 * - Dispute resolution (prove earning legitimacy)
 * - Analytics enrichment (earning patterns)
 *
 * WHY awardedBy Foreign Key (Optional)?
 * - Track admin/trainer manual awards
 * - Audit trail for manual badge granting
 * - Prevent abuse (who awarded what to whom)
 * - SET NULL on delete (preserve award history)
 *
 * WHY earningType ENUM?
 * - Categorize earning methods for analytics
 * - Filter badges by type (automatic vs manual)
 * - Business intelligence (most earned badge types)
 * - Reward system differentiation
 *
 * WHY isDisplayed Toggle?
 * - User privacy control (hide certain badges)
 * - Profile customization (show/hide badges)
 * - Admin badge management (hide deprecated badges)
 * - Soft delete functionality
 *
 * Security Model:
 * - User-specific read access (own badges only)
 * - Admin read access (all badges for management)
 * - Admin write access (manual badge awarding)
 * - System write access (automatic badge awarding)
 * - Audit trail for all badge awards
 *
 * Performance Considerations:
 * - 5 indexes for common queries (user badges, badge stats, chronological)
 * - Unique constraint for fast ownership checking
 * - JSON context field for flexible metadata
 * - Badge ownership caching for profile loads
 *
 * Rollback Strategy:
 * - DROP TABLE UserBadges (preserves badge definitions)
 * - User points/rewards may need manual reconciliation
 *
 * Dependencies:
 * - Users table (userId and awardedBy foreign keys)
 * - Badges table (badgeId foreign key)
 *
 * Created: 2026-01-04
 * Part of: Phase 1 Gamification Foundation
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserBadges', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    badgeId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Badges',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    earnedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    earningType: {
      type: Sequelize.ENUM(
        'automatic',
        'manual',
        'challenge',
        'referral',
        'purchase'
      ),
      allowNull: false,
      defaultValue: 'automatic'
    },
    earningContext: {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Context about how/why the badge was earned'
    },
    awardedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Admin/trainer who manually awarded this badge'
    },
    isDisplayed: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether user wants to display this badge publicly'
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

  // Add unique constraint to prevent duplicate ownership
  await queryInterface.addConstraint('UserBadges', {
    fields: ['userId', 'badgeId'],
    type: 'unique',
    name: 'unique_user_badge_ownership'
  });

  // Add indexes for performance
  await queryInterface.addIndex('UserBadges', ['userId']);
  await queryInterface.addIndex('UserBadges', ['badgeId']);
  await queryInterface.addIndex('UserBadges', ['earnedAt']);
  await queryInterface.addIndex('UserBadges', ['earningType']);
  await queryInterface.addIndex('UserBadges', ['awardedBy']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('UserBadges');
}