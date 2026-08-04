/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           USER REWARDS REDEMPTION JUNCTION TABLE MIGRATION                ║
 * ║        (Many-to-Many: Users ↔ Rewards Redemption Tracking)               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Track reward redemptions with fulfillment workflow (M:M junction)
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Reward Redemption & Fulfillment Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ User Redeems → Deduct Points → Pending Status → Admin Fulfills → Done   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Relationship Diagram:
 * ┌──────────────┐          ┌──────────────────┐          ┌──────────────┐
 * │    Users     │          │  UserRewards     │          │   Rewards    │
 * │              │          │  (Junction)      │          │              │
 * │ - id (PK)    │◄─────────│ - userId (FK)    │─────────►│ - id (PK)    │
 * │ - totalPoints│          │ - rewardId (FK)  │          │ - pointCost  │
 * └──────────────┘          │ - status (ENUM)  │          │ - stock      │
 *         ▲                 │ - fulfilledBy(FK)│          └──────────────┘
 *         │                 └──────────────────┘
 *         │                          │
 *         └──────────────────────────┘
 *           (fulfilledBy references Users - admin who fulfilled)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  DATABASE ERD - REWARD REDEMPTION                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * UserRewards Table (Redemption Tracking):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Table: UserRewards                                                       │
 * ├─────────────────────┬───────────────────────────────────────────────────┤
 * │ id                  │ UUID (PK)                                          │
 * │ userId              │ UUID (FK → Users.id) - Who redeemed this          │
 * │ rewardId            │ UUID (FK → Rewards.id) - What was redeemed        │
 * │ redeemedAt          │ DATE (When user clicked "Redeem")                 │
 * │ pointsCost          │ INTEGER (Price snapshot at redemption time)       │
 * │ status              │ ENUM('pending','fulfilled','cancelled','expired') │
 * │ fulfillmentDetails  │ JSON (Tracking info, notes, etc.)                 │
 * │ expiresAt           │ DATE (When redemption expires if not fulfilled)   │
 * │ fulfilledBy         │ UUID (FK → Users.id) - Admin who fulfilled        │
 * │ fulfilledAt         │ DATE (When admin marked as fulfilled)             │
 * │ createdAt           │ DATE (Auto-managed)                               │
 * │ updatedAt           │ DATE (Auto-managed)                               │
 * └─────────────────────┴───────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DATA FLOW DIAGRAM                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Reward Redemption & Fulfillment Workflow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. USER REDEMPTION                                                        │
 * │    User browses catalog → Clicks "Redeem" on reward (500 points)         │
 * │    ↓                                                                      │
 * │    POST /gamification/redeem { rewardId: "abc-123" }                     │
 * │    ↓                                                                      │
 * │    Validate:                                                             │
 * │      - user.totalPoints >= reward.pointCost ✓                            │
 * │      - reward.isActive = true ✓                                          │
 * │      - reward.stock > 0 OR stock = -1 ✓                                  │
 * │    ↓                                                                      │
 * │    BEGIN TRANSACTION;                                                    │
 * │      a) Deduct points: user.totalPoints -= 500                           │
 * │      b) Decrement stock: reward.stock -= 1                               │
 * │      c) Increment counter: reward.redemptionCount += 1                   │
 * │      d) CREATE UserRewards (                                             │
 * │           userId, rewardId, pointsCost=500, status='pending',            │
 * │           redeemedAt=NOW, expiresAt=NOW + 30 days                        │
 * │         )                                                                │
 * │      e) CREATE PointTransaction (type='spent', source='reward_redeem')   │
 * │    COMMIT;                                                               │
 * │    ↓                                                                      │
 * │    Notify user: "Reward redeemed! Admin will fulfill soon."              │
 * │    Notify admin: "New redemption: [Free Session] by [John Doe]"          │
 * │                                                                           │
 * │ 2. ADMIN FULFILLMENT                                                     │
 * │    Admin Dashboard → GET /admin/rewards/redemptions?status=pending       │
 * │    ↓                                                                      │
 * │    Admin sees pending redemptions list                                   │
 * │    Admin ships product / schedules session / sends discount code         │
 * │    ↓                                                                      │
 * │    PATCH /admin/rewards/redemptions/:id { status: 'fulfilled' }          │
 * │    ↓                                                                      │
 * │    UPDATE UserRewards SET                                                │
 * │      status = 'fulfilled',                                               │
 * │      fulfilledBy = adminUserId,                                          │
 * │      fulfilledAt = NOW,                                                  │
 * │      fulfillmentDetails = { trackingNumber: "ABC123", ... }              │
 * │    ↓                                                                      │
 * │    Notify user: "Your reward [Free Session] has been fulfilled!"         │
 * │                                                                           │
 * │ 3. EXPIRATION HANDLING (Cron Job)                                        │
 * │    Daily cron: SELECT * FROM UserRewards WHERE                           │
 * │                expiresAt < NOW AND status = 'pending'                    │
 * │    ↓                                                                      │
 * │    For each expired redemption:                                          │
 * │      BEGIN TRANSACTION;                                                  │
 * │        a) UPDATE UserRewards SET status = 'expired'                      │
 * │        b) Refund points: user.totalPoints += pointsCost                  │
 * │        c) Increment stock: reward.stock += 1                             │
 * │        d) CREATE PointTransaction (type='refund', source='reward_expire')│
 * │      COMMIT;                                                             │
 * │    ↓                                                                      │
 * │    Notify user: "Redemption expired. 500 points refunded."               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY status ENUM (4 States)?
 * - 'pending': User redeemed, waiting for admin to fulfill
 * - 'fulfilled': Admin completed fulfillment (shipped product, etc.)
 * - 'cancelled': User/admin cancelled before fulfillment (points refunded)
 * - 'expired': Redemption expired (e.g., admin didn't fulfill in 30 days)
 * - Workflow tracking: Clear status transitions (pending → fulfilled/cancelled/expired)
 * - Query optimization: WHERE status = 'pending' for admin dashboard
 *
 * WHY pointsCost Snapshot (Not Reference Rewards.pointCost)?
 * - Price stability: Stores actual cost at time of redemption
 * - Historical accuracy: If reward price changes, past redemptions unaffected
 * - Refund logic: If expired/cancelled, refund exact amount user paid
 * - Audit trail: "User paid 500 points (now costs 750)"
 * - Self-contained record: No JOIN needed to see redemption cost
 *
 * WHY fulfillmentDetails JSON?
 * - Flexible data: Different reward types need different info
 *   - Product: { trackingNumber, carrier, estimatedDelivery }
 *   - Session: { scheduledDate, trainerId, sessionId }
 *   - Discount: { promoCode, expiresAt, percentOff }
 * - Admin notes: Store custom fulfillment instructions
 * - Audit trail: Track all fulfillment actions and updates
 * - Future-proof: Can add new fields without schema changes
 *
 * WHY expiresAt (Expiration Enforcement)?
 * - SLA enforcement: Admin must fulfill within X days (default 30)
 * - Auto-refund: Expired redemptions refund points automatically
 * - Urgency: Motivates admin to process redemptions quickly
 * - User protection: Prevents points being locked indefinitely
 * - Storage cleanup: Can archive expired redemptions after 90 days
 *
 * WHY fulfilledBy (Track Which Admin)?
 * - Accountability: Know which admin fulfilled the reward
 * - Performance metrics: "Admin X fulfilled 50 redemptions this month"
 * - Quality control: Track fulfillment errors by admin
 * - Audit trail: If user reports issue, know who to ask
 * - Workload distribution: Balance redemption assignments across admins
 *
 * WHY fulfilledAt Timestamp?
 * - SLA tracking: fulfilledAt - redeemedAt = fulfillment time
 * - Analytics: "Average fulfillment time = 2.3 days"
 * - Performance review: Which admins fulfill fastest?
 * - User expectations: Show "Fulfilled on [date]" in redemption history
 * - NULL vs date: NULL = not yet fulfilled, date = completed
 *
 * WHY Foreign Key to Users (Both userId AND fulfilledBy)?
 * - Two relationships: User who redeemed + Admin who fulfilled
 * - userId CASCADE: If user deletes account, remove their redemptions
 * - fulfilledBy SET NULL: If admin account deleted, keep redemption record
 * - Data integrity: Both FKs enforce valid user references
 * - Separate concerns: Redeemer vs Fulfiller are distinct roles
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          INDEXES & CONSTRAINTS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * No indexes created (junction table, query patterns simple).
 *
 * Future Optimization (if redemption volume grows):
 * - CREATE INDEX idx_user_rewards_status ON UserRewards(status)
 *   - Use case: Admin dashboard filter "Show pending redemptions"
 * - CREATE INDEX idx_user_rewards_expires ON UserRewards(expiresAt, status)
 *   - Use case: Cron job to find expired pending redemptions
 * - CREATE INDEX idx_user_rewards_user ON UserRewards(userId)
 *   - Use case: User's redemption history page
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Transaction protection: Redemption is atomic (points + stock + record)
 * - Point validation: Server-side check user.totalPoints >= pointsCost
 * - Stock validation: Prevent redemption if stock = 0
 * - Admin-only fulfillment: Only role='admin' can update status to 'fulfilled'
 * - Cascade delete: User deletion removes their redemptions
 * - SET NULL on fulfiller: Admin deletion doesn't corrupt redemption records
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Safe for production: CREATE TABLE is non-destructive
 * - Foreign key safety: Requires Users and Rewards tables exist
 * - Rollback support: down() drops table cleanly
 * - No data loss: Junction table creation doesn't affect existing data
 * - CASCADE behavior: userId deletion cascades, fulfilledBy sets NULL
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - 20250212060728-create-user-table.cjs (Users table)
 * - 20250505001100-create-rewards.mjs (Rewards table)
 *
 * Related Code Files:
 * - backend/controllers/gamificationController.mjs (redeemReward method)
 * - backend/routes/gamificationRoutes.mjs (POST /redeem endpoint)
 * - backend/models/UserReward.mjs (Sequelize model)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserRewards', {
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
    rewardId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Rewards',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    redeemedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    pointsCost: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: Sequelize.ENUM('pending', 'fulfilled', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'pending'
    },
    fulfillmentDetails: {
      type: Sequelize.JSON,
      allowNull: true
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    fulfilledBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    fulfilledAt: {
      type: Sequelize.DATE,
      allowNull: true
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
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('UserRewards');
}
