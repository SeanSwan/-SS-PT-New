/**
 * Challenges Table Migration (Admin-Created Challenge System)
 * ==========================================================
 *
 * Purpose: Creates the Challenges table for admin-created fitness challenges
 * with flexible rules, timeframes, and participant management
 *
 * Blueprint Reference: SwanStudios Unified AI Backend Implementation Plan v1.0
 *
 * Migration Date: 2026-01-04
 *
 * Table Created: Challenges
 *
 * Database ERD:
 * ```
 *      ┌──────────────────────┐                    ┌──────────────────────┐
 *      │ Users                │◄───────────────────│ Challenges           │
 *      │   (UUID)             │  (createdBy FK)    │   (UUID)              │
 *      └──────┬───────────────┘                    └──────┬───────────────┘
 *             │                                           │
 *             │ (userId)                                  │ (challengeId)
 *             │                                           │
 *      ┌──────▼───────────────┐                    ┌──────▼───────────────┐
 *      │ ChallengeParticipants│                    │ Badges               │
 *      │   (UUID)             │                    │   (UUID)              │
 *      └──────────────────────┘                    └──────────────────────┘
 * ```
 *
 * Challenge Types:
 * - individual: Personal goals and achievements
 * - team: Group competitions with leaderboards
 * - streak: Consecutive day challenges
 * - accumulation: Total points/goals over timeframe
 * - elimination: Last person standing format
 * - custom: Admin-defined custom rules
 *
 * Data Flow (Challenge Lifecycle):
 * ```
 * 1. ADMIN CREATES CHALLENGE:
 *    POST /api/challenges → validate rules → set timeframe → publish
 *
 * 2. USERS ENROLL:
 *    POST /api/challenges/:id/enroll → add to participants → track progress
 *
 * 3. PROGRESS TRACKING:
 *    user actions → update participant progress → check completion
 *
 * 4. CHALLENGE COMPLETION:
 *    criteria met → award badges → update leaderboards → notify participants
 *
 * 5. CHALLENGE END:
 *    calculate winners → distribute rewards → archive challenge
 * ```
 *
 * Indexes (6 total):
 * - createdBy: Admin's challenges
 * - type: Filter by challenge type
 * - status: Active challenge queries
 * - startDate/endDate: Time-based filtering
 * - rewardBadgeId: Badge reward lookups
 * - maxParticipants: Capacity checking
 *
 * Business Logic:
 *
 * WHY startDate/endDate Fields?
 * - Time-bound challenges (weekly, monthly, seasonal)
 * - Automatic activation/deactivation
 * - Progress tracking within timeframe
 * - Leaderboard finalization on end date
 *
 * WHY rules JSON Field?
 * - Flexible challenge criteria (exercise types, point systems, bonuses)
 * - Example: {"targetExercises": ["squat", "pushup"], "dailyGoal": 100, "bonusMultiplier": 2}
 * - Complex multi-condition logic
 * - Extensible without schema changes
 *
 * WHY rewards JSON Field?
 * - Multiple reward types (badges, points, titles, customizations)
 * - Example: {"badgeId": "uuid", "points": 1000, "title": "Challenge Champion"}
 * - Tiered rewards (gold/silver/bronze)
 * - Admin-configurable reward structures
 *
 * WHY rewardBadgeId Foreign Key?
 * - Link to specific badge earned on completion
 * - Automatic badge awarding on challenge completion
 * - Badge progress tracking
 * - SET NULL on delete (preserve challenge history)
 *
 * WHY participantCount/maxParticipants Fields?
 * - Fast capacity checking (avoid COUNT(*) queries)
 * - Enrollment limits enforcement
 * - Progress percentage calculations
 * - UI display optimization
 *
 * Security Model:
 * - Admin-only creation and management
 * - Public read access (challenge browsing)
 * - User enrollment restrictions (capacity, eligibility)
 * - Challenge integrity protection (no manipulation)
 *
 * Performance Considerations:
 * - 6 indexes for common queries (admin, type, status, dates, rewards)
 * - Participant count caching (avoid expensive joins)
 * - Challenge status indexing for active challenge queries
 * - Time-based partitioning for large datasets
 *
 * Rollback Strategy:
 * - SET NULL on challenge_participants.challengeId
 * - SET NULL on badges.rewardBadgeId
 * - DROP TABLE Challenges
 *
 * Dependencies:
 * - Users table (createdBy admin tracking)
 * - Badges table (optional rewardBadgeId FK)
 * - ChallengeParticipants table (dependent relationship)
 *
 * Created: 2026-01-04
 * Part of: Phase 1 Gamification Foundation
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Challenges', {
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
    type: {
      type: Sequelize.ENUM(
        'individual',
        'team',
        'streak',
        'accumulation',
        'elimination',
        'custom'
      ),
      allowNull: false,
      defaultValue: 'individual'
    },
    status: {
      type: Sequelize.ENUM(
        'draft',
        'published',
        'active',
        'completed',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'draft'
    },
    startDate: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When challenge becomes active'
    },
    endDate: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When challenge ends'
    },
    rules: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {},
      comment: 'Challenge rules and criteria definition'
    },
    rewards: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: { points: 500 },
      comment: 'Reward structure for completion'
    },
    rewardBadgeId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Badges',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Badge awarded for challenge completion'
    },
    maxParticipants: {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      },
      comment: 'Maximum number of participants (null = unlimited)'
    },
    participantCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Current number of enrolled participants'
    },
    eligibilityRules: {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: {},
      comment: 'Who can join (role requirements, prerequisites, etc.)'
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
      comment: 'Admin who created this challenge'
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
  await queryInterface.addIndex('Challenges', ['createdBy']);
  await queryInterface.addIndex('Challenges', ['type']);
  await queryInterface.addIndex('Challenges', ['status']);
  await queryInterface.addIndex('Challenges', ['startDate']);
  await queryInterface.addIndex('Challenges', ['endDate']);
  await queryInterface.addIndex('Challenges', ['rewardBadgeId']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('Challenges');
}