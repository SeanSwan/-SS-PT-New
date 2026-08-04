/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        USER MILESTONES JUNCTION TABLE MIGRATION                           ║
 * ║      (Many-to-Many: Users ↔ Milestones Achievement Tracking)             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Track milestone completion with tier promotion (M:M junction)
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Tier Promotion via Milestones:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Points Accumulate → Cross Threshold → Promote Tier → Award Bonus Points │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Relationship Diagram:
 * ┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
 * │    Users     │         │ UserMilestones   │         │  Milestones  │
 * │              │         │   (Junction)     │         │              │
 * │ - id         │◄────────│ - userId (FK)    │────────►│ - id         │
 * │ - totalPoints│         │ - milestoneId(FK)│         │ - targetPts  │
 * │ - currentTier│         │ - reachedAt      │         │ - bonusPts   │
 * └──────────────┘         │ - bonusPtsAwarded│         │ - tier       │
 *                          └──────────────────┘         └──────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  DATABASE ERD - MILESTONE TRACKING                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * UserMilestones Table:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Table: UserMilestones                                                    │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ id                   │ UUID (PK)                                         │
 * │ userId               │ UUID (FK → Users.id)                             │
 * │ milestoneId          │ UUID (FK → Milestones.id)                        │
 * │ reachedAt            │ DATE (When user hit targetPoints threshold)      │
 * │ bonusPointsAwarded   │ INTEGER (Bonus points given - price snapshot)    │
 * │ notificationSent     │ BOOLEAN (Prevent duplicate tier-up notifications)│
 * │ createdAt            │ DATE (Auto-managed)                              │
 * │ updatedAt            │ DATE (Auto-managed)                              │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ UNIQUE INDEX         │ (userId, milestoneId) - Can't reach milestone 2x │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DATA FLOW DIAGRAM                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Milestone Completion & Tier Promotion:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. POINTS EARNED (Trigger)                                                │
 * │    User earns 50 points → user.totalPoints = 1000                         │
 * │    ↓                                                                      │
 * │    Auto-check: Did user cross any milestone threshold?                   │
 * │                                                                           │
 * │ 2. MILESTONE ELIGIBILITY CHECK                                           │
 * │    Query: SELECT * FROM Milestones WHERE                                 │
 * │           targetPoints <= 1000 AND                                       │
 * │           tier > user.currentTier AND                                    │
 * │           isActive = true                                                │
 * │    ↓                                                                      │
 * │    Found: "Silver Tier - 1000 Points" milestone                          │
 * │    ↓                                                                      │
 * │    Check: Already reached?                                               │
 * │      SELECT * FROM UserMilestones WHERE                                  │
 * │        userId = user.id AND milestoneId = milestone.id                   │
 * │    ↓                                                                      │
 * │    Not found → User is eligible for promotion!                           │
 * │                                                                           │
 * │ 3. TIER PROMOTION (Transaction-protected)                                │
 * │    BEGIN TRANSACTION;                                                    │
 * │      a) UPDATE Users SET currentTier = 'silver'                          │
 * │      b) UPDATE Users SET totalPoints += 100 (bonusPoints)                │
 * │      c) INSERT INTO UserMilestones (                                     │
 * │           userId, milestoneId,                                           │
 * │           reachedAt = NOW,                                               │
 * │           bonusPointsAwarded = 100,                                      │
 * │           notificationSent = false                                       │
 * │         )                                                                │
 * │      d) INSERT INTO PointTransactions (                                  │
 * │           type='earned', source='milestone_bonus', points=100            │
 * │         )                                                                │
 * │    COMMIT;                                                               │
 * │    ↓                                                                      │
 * │    Notify user: "Tier Promotion! You're now Silver Tier! +100 pts bonus!"│
 * │    UPDATE: notificationSent = true                                       │
 * │                                                                           │
 * │ 4. PROGRESS DISPLAY (Dashboard Widget)                                   │
 * │    Current: Silver Tier (1100 points)                                    │
 * │    Next Milestone: Gold Tier (2500 points)                               │
 * │    Progress: 1100 / 2500 = 44% complete                                  │
 * │    ↓                                                                      │
 * │    Display: "You need 1,400 more points to reach Gold Tier!"             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY bonusPointsAwarded Snapshot?
 * - Price stability: Store actual bonus given at time of milestone reach
 * - Historical accuracy: If Milestones.bonusPoints changes, past awards unchanged
 * - Analytics: Total bonus points given across all users
 * - Audit trail: "User got 100 bonus points (now worth 150)"
 * - Self-contained: No JOIN needed to see what user earned
 *
 * WHY notificationSent Boolean?
 * - Idempotency: Prevent duplicate "Tier Promotion!" notifications
 * - Async processing: Background job queries WHERE notificationSent = false
 * - Retry logic: If notification fails, can retry
 * - Debugging: Track which users weren't notified
 * - UX: Avoid spamming users with duplicate tier-up messages
 *
 * WHY reachedAt Timestamp (Not Just Use createdAt)?
 * - Precision: Exact moment user crossed threshold
 * - Analytics: "How long until users reach Silver?" (reachedAt - user.createdAt)
 * - Leaderboards: "Who reached Gold Tier first?"
 * - Time-based rewards: "First 10 to reach Platinum get bonus reward"
 * - Same as createdAt for milestones, but semantically clearer
 *
 * WHY UNIQUE Constraint (userId, milestoneId)?
 * - Idempotency: Can't reach same milestone twice
 * - Point farming prevention: No duplicate bonus awards
 * - Data integrity: One record per user per milestone
 * - UPSERT safety: ON CONFLICT DO NOTHING pattern
 * - Database-enforced: Not just app logic
 *
 * WHY CASCADE DELETE?
 * - User deletion: Remove milestone history when account deleted
 * - Milestone deletion: Cleanup records if milestone removed
 * - GDPR compliance: Full user data removal
 * - No orphaned records: Maintains referential integrity
 * - Auto-cleanup: No manual intervention needed
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          INDEXES & CONSTRAINTS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Indexes:
 * 1. user_milestone_unique - UNIQUE (userId, milestoneId)
 *
 * Future Optimization:
 * - CREATE INDEX idx_user_milestones_user ON UserMilestones(userId)
 *   - Use case: User's milestone history page
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Server-side tier promotion: Client cannot trigger promotion
 * - Transaction atomic: All-or-nothing (tier + points + record)
 * - Unique constraint: Database prevents duplicate bonuses
 * - Cascade delete: Orphan prevention on user/milestone deletion
 * - Point validation: bonusPointsAwarded matches Milestones.bonusPoints
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Safe for production: CREATE TABLE non-destructive
 * - Foreign key safety: Requires Users + Milestones tables
 * - Rollback support: down() drops table cleanly
 * - No data loss: Junction creation doesn't affect existing data
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - 20250212060728-create-user-table.cjs
 * - 20250505001200-create-milestones.mjs
 *
 * Related Code:
 * - backend/controllers/gamificationController.mjs (checkMilestones method)
 * - backend/models/UserMilestone.mjs
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserMilestones', {
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
    milestoneId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Milestones',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    reachedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    bonusPointsAwarded: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    notificationSent: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
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

  // Add unique constraint on userId and milestoneId
  await queryInterface.addIndex('UserMilestones', ['userId', 'milestoneId'], {
    unique: true,
    name: 'user_milestone_unique'
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('UserMilestones');
}
