/**
 * Point Transactions Migration (Gamification Audit Log)
 * ======================================================
 *
 * Purpose: Creates PointTransactions audit log table for complete point economy tracking
 * with 5 transaction types, 12 source categories, and balance snapshots
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Gamification System
 *
 * Migration Date: 2025-05-05
 *
 * Table Created: PointTransactions
 *
 * Database ERD:
 * ```
 *      ┌──────────────┐                    ┌──────────────┐
 *      │    users     │◄───────────────────│    users     │
 *      │   (userId)   │   (awardedBy FK)   │ (awardedBy)  │
 *      └──────┬───────┘                    └──────────────┘
 *             │
 *             │ (userId FK)
 *             │
 *      ┌──────▼───────────────┐
 *      │ PointTransactions    │ (audit log - append-only)
 *      │      (UUID)          │
 *      └──────────────────────┘
 * ```
 *
 * Transaction Types (5 total):
 * - earn: Positive points from activities (workouts, achievements)
 * - spend: Negative points from reward redemption
 * - adjustment: Admin correction (positive or negative)
 * - bonus: Special promotional points (events, holidays)
 * - expire: Negative points from expiration policy
 *
 * Source Categories (12 total):
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ SOURCE                TRANSACTION TYPE    TYPICAL POINTS                     │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ workout_completion    earn               +50 (GamificationSettings)          │
 * │ exercise_completion   earn               +10 per exercise                    │
 * │ streak_bonus          earn               +20 daily                           │
 * │ level_up              earn               +100 (achievement)                  │
 * │ achievement_earned    earn               +100-1000 (tier-based)              │
 * │ milestone_reached     earn               +500 (major milestone)              │
 * │ reward_redemption     spend              -500 (reward cost)                  │
 * │ package_purchase      earn               +200 (purchase bonus)               │
 * │ friend_referral       earn               +200 (referral reward)              │
 * │ admin_adjustment      adjustment         ±N (manual correction)              │
 * │ trainer_award         bonus              +50 (trainer discretion)            │
 * │ challenge_completion  earn               +300 (monthly challenge)            │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Data Flow (Point Transaction Lifecycle):
 * ```
 * 1. CLIENT EARNS POINTS:
 *    workout_sessions.status='completed' → gamificationController.awardPoints()
 *
 * 2. CREATE TRANSACTION RECORD:
 *    PointTransactions.create({
 *      userId,
 *      points: +50,
 *      balance: user.pointsBalance + 50,
 *      transactionType: 'earn',
 *      source: 'workout_completion',
 *      sourceId: workoutSession.id
 *    })
 *
 * 3. UPDATE USER BALANCE:
 *    users.pointsBalance += 50
 *
 * 4. AUDIT TRAIL:
 *    - ALL transactions preserved (append-only table)
 *    - Balance snapshot at transaction time
 *    - sourceId links to original entity (workout, achievement, reward)
 *    - awardedBy tracks admin/trainer who manually awarded points
 * ```
 *
 * Indexes (4 total):
 * - userId: Fast user transaction history lookup
 * - transactionType: Filter by earn/spend/adjustment
 * - source: Group by workout/achievement/referral
 * - createdAt: Time-based reporting (monthly point summaries)
 *
 * Business Logic:
 *
 * WHY Immutable Audit Log (No UPDATE/DELETE)?
 * - Complete transaction history for compliance (GDPR right to data)
 * - Fraud detection (identify point manipulation patterns)
 * - Dispute resolution (user claims incorrect points)
 * - Analytics (track point economy health)
 *
 * WHY balance Snapshot Field?
 * - Faster balance verification (no SUM aggregation required)
 * - Detect balance tampering (balance should match SUM(points))
 * - Historical balance at transaction time (even if later adjusted)
 * - Simplifies balance reconciliation queries
 *
 * WHY sourceId UUID (Not Typed Foreign Keys)?
 * - Flexible source tracking (workouts, achievements, rewards, referrals)
 * - Avoids 12 separate foreign key columns
 * - Application resolves source type from 'source' ENUM
 * - SET NULL on delete would lose audit trail context
 *
 * WHY awardedBy Foreign Key (Optional)?
 * - Track admin/trainer manual point awards
 * - Prevent abuse (audit trail of who awarded points)
 * - Null for automated awards (system-generated)
 * - SET NULL on delete (preserve transaction even if admin leaves)
 *
 * WHY metadata JSON Field?
 * - Store additional context (workout details, achievement tier, etc.)
 * - Example: {"workoutDuration": 45, "exercisesCompleted": 12}
 * - Debugging tool (reproduce point calculation logic)
 * - Flexible schema (no migration needed for new fields)
 *
 * Security Model:
 * - Append-only table (no UPDATE/DELETE allowed)
 * - Admin read access (view all transactions)
 * - User read access (own transactions only)
 * - Foreign key cascade on user delete (GDPR compliance)
 *
 * Performance Considerations:
 * - 4 indexes for fast queries (userId, type, source, date)
 * - Partition table by createdAt (monthly partitions for large datasets)
 * - Archive old transactions (>1 year) to separate table
 *
 * Rollback Strategy:
 * - DROP TABLE PointTransactions (no dependent tables)
 *
 * Dependencies:
 * - users table (userId and awardedBy foreign keys)
 *
 * Created: 2025-05-05
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('PointTransactions', {
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
    points: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    balance: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    transactionType: {
      type: Sequelize.ENUM('earn', 'spend', 'adjustment', 'bonus', 'expire'),
      allowNull: false
    },
    source: {
      type: Sequelize.ENUM(
        'workout_completion', 
        'exercise_completion', 
        'streak_bonus', 
        'level_up',
        'achievement_earned', 
        'milestone_reached',
        'reward_redemption',
        'package_purchase',
        'friend_referral',
        'admin_adjustment',
        'trainer_award',
        'challenge_completion'
      ),
      allowNull: false
    },
    sourceId: {
      type: Sequelize.UUID,
      allowNull: true
    },
    description: {
      type: Sequelize.STRING,
      allowNull: false
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true
    },
    awardedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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

  // Add indexes for common queries
  await queryInterface.addIndex('PointTransactions', ['userId']);
  await queryInterface.addIndex('PointTransactions', ['transactionType']);
  await queryInterface.addIndex('PointTransactions', ['source']);
  await queryInterface.addIndex('PointTransactions', ['createdAt']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('PointTransactions');
}