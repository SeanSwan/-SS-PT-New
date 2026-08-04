/**
 * Challenge Participants Table Migration (Challenge Enrollment & Progress)
 * ======================================================================
 *
 * Purpose: Creates the ChallengeParticipants table for tracking user enrollment
 * in challenges, progress updates, and completion status
 *
 * Blueprint Reference: SwanStudios Unified AI Backend Implementation Plan v1.0
 *
 * Migration Date: 2026-01-04
 *
 * Table Created: ChallengeParticipants
 *
 * Database ERD:
 * ```
 *      ┌──────────────────────┐                    ┌──────────────────────┐
 *      │ Challenges           │◄───────────────────│ ChallengeParticipants│
 *      │   (UUID)             │  (challengeId FK)  │   (UUID)              │
 *      └──────┬───────────────┘                    └──────┬───────────────┘
 *             │                                           │
 *             │ (challengeId)                             │ (userId)
 *             │                                           │
 *      ┌──────▼───────────────┐                    ┌──────▼───────────────┐
 *      │ ChallengeParticipants│                    │ Users                │
 *      │   (UUID)             │                    │   (UUID)              │
 *      └──────────────────────┘                    └──────────────────────┘
 * ```
 *
 * Enrollment Status:
 * - enrolled: Actively participating
 * - completed: Successfully finished challenge
 * - disqualified: Removed for rule violations
 * - withdrawn: User voluntarily left
 * - pending: Waiting for approval (private challenges)
 *
 * Data Flow (Challenge Participation):
 * ```
 * 1. USER ENROLLS:
 *    POST /api/challenges/:id/enroll → validate eligibility → create participant record
 *
 * 2. PROGRESS TRACKING:
 *    user actions → update progress → check completion criteria
 *
 * 3. COMPLETION CHECK:
 *    progress meets rules → mark completed → award rewards → update leaderboards
 *
 * 4. CHALLENGE END:
 *    calculate final standings → distribute rewards → archive results
 * ```
 *
 * Indexes (5 total):
 * - challengeId: Challenge participant queries
 * - userId: User's enrolled challenges
 * - status: Active participant filtering
 * - enrolledAt: Enrollment timeline
 * - completedAt: Completion tracking
 *
 * Business Logic:
 *
 * WHY Unique Constraint on (challengeId, userId)?
 * - Prevent duplicate enrollments
 * - One participation per user per challenge
 * - Data integrity protection
 * - Efficient enrollment checking
 *
 * WHY progress JSON Field?
 * - Flexible progress tracking (exercise counts, points, streaks)
 * - Example: {"exercisesCompleted": 25, "totalPoints": 1250, "currentStreak": 7}
 * - Challenge-type specific metrics
 * - Real-time progress updates
 *
 * WHY completedAt Timestamp?
 * - Track completion timing for leaderboards
 * - Calculate completion speed bonuses
 * - Analytics on challenge engagement
 * - NULL for incomplete participants
 *
 * WHY disqualificationReason Field?
 * - Audit trail for removals (cheating, inactivity)
 * - Appeal process support
 * - Admin decision documentation
 * - Transparency for participants
 *
 * WHY finalRanking Integer?
 * - Leaderboard positioning
 * - Prize distribution logic
 * - Achievement bragging rights
 * - Performance analytics
 *
 * Security Model:
 * - User-specific enrollment (own challenges only)
 * - Admin read access (all participants)
 * - Challenge creator management rights
 * - Progress update validation
 *
 * Performance Considerations:
 * - 5 indexes for common queries (challenge, user, status, dates)
 * - Unique constraint for fast enrollment checking
 * - JSON progress field for flexible metrics
 * - Participant count caching in challenges table
 *
 * Rollback Strategy:
 * - DROP TABLE ChallengeParticipants (preserves challenge definitions)
 * - Update challenges.participantCount may need reconciliation
 *
 * Dependencies:
 * - Challenges table (challengeId foreign key)
 * - Users table (userId foreign key)
 *
 * Created: 2026-01-04
 * Part of: Phase 1 Gamification Foundation
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('ChallengeParticipants', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    challengeId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Challenges',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
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
    status: {
      type: Sequelize.ENUM(
        'enrolled',
        'completed',
        'disqualified',
        'withdrawn',
        'pending'
      ),
      allowNull: false,
      defaultValue: 'enrolled'
    },
    enrolledAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    progress: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {},
      comment: 'Current progress metrics (exercise counts, points, streaks, etc.)'
    },
    completedAt: {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When participant completed the challenge'
    },
    disqualificationReason: {
      type: Sequelize.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500] // Optional, up to 500 characters
      },
      comment: 'Reason for disqualification (if applicable)'
    },
    finalRanking: {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      },
      comment: 'Final position in challenge leaderboard'
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

  // Add unique constraint to prevent duplicate enrollments
  await queryInterface.addConstraint('ChallengeParticipants', {
    fields: ['challengeId', 'userId'],
    type: 'unique',
    name: 'unique_challenge_participation'
  });

  // Add indexes for performance
  await queryInterface.addIndex('ChallengeParticipants', ['challengeId']);
  await queryInterface.addIndex('ChallengeParticipants', ['userId']);
  await queryInterface.addIndex('ChallengeParticipants', ['status']);
  await queryInterface.addIndex('ChallengeParticipants', ['enrolledAt']);
  await queryInterface.addIndex('ChallengeParticipants', ['completedAt']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('ChallengeParticipants');
}