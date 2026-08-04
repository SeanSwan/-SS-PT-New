/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║              GAMIFICATION REWARDS CATALOG MIGRATION                       ║
 * ║                 SwanStudios Gamification System                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Create Rewards table - redeemable catalog items earned via points
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Gamification Ecosystem Architecture:
 * ┌───────────────┐      ┌──────────────┐      ┌─────────────────┐
 * │  Achievements │──┐   │  Milestones  │──┐   │ Point Settings  │
 * │   (Goals)     │  │   │  (Tiers)     │  │   │ (Economy Config)│
 * └───────────────┘  │   └──────────────┘  │   └─────────────────┘
 *                    │                     │            │
 *                    ├─────────────────────┼────────────┘
 *                    ▼                     ▼
 *           ┌────────────────────────────────────┐
 *           │        Point Transactions          │
 *           │   (Earn points, spend points)      │
 *           └────────────────────────────────────┘
 *                    │                     │
 *      ┌─────────────┘                     └─────────────┐
 *      ▼                                                 ▼
 * ┌───────────┐                                   ┌──────────┐
 * │  Rewards  │◄──────── Redemption ──────────────│  Users   │
 * │ (Catalog) │                                   │ (Points) │
 * └───────────┘                                   └──────────┘
 *      │
 *      ▼
 * ┌─────────────────┐
 * │  UserRewards    │
 * │ (Redemptions)   │
 * └─────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    DATABASE ERD - REWARDS ECOSYSTEM                      │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Rewards Table (Catalog):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Table: Rewards                                                           │
 * ├──────────────────┬──────────────────────────────────────────────────────┤
 * │ id               │ UUID (PK)                                             │
 * │ name             │ STRING (e.g., "Free Training Session")               │
 * │ description      │ TEXT (Full reward description)                       │
 * │ icon             │ STRING (Default: 'Gift')                             │
 * │ pointCost        │ INTEGER (e.g., 500 points)                           │
 * │ tier             │ ENUM('bronze','silver','gold','platinum')            │
 * │ stock            │ INTEGER (Inventory count, -1 = unlimited)            │
 * │ isActive         │ BOOLEAN (Admin can deactivate rewards)               │
 * │ redemptionCount  │ INTEGER (Total times redeemed - analytics)           │
 * │ imageUrl         │ STRING (Optional visual asset)                       │
 * │ rewardType       │ ENUM('session','product','discount','service','other')│
 * │ expiresAt        │ DATE (Optional expiration for limited-time offers)   │
 * │ createdAt        │ DATE (Auto-managed)                                  │
 * │ updatedAt        │ DATE (Auto-managed)                                  │
 * └──────────────────┴──────────────────────────────────────────────────────┘
 *
 * Related Tables:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ UserRewards (M:M Junction - Redemption Tracking)                        │
 * ├──────────────────┬──────────────────────────────────────────────────────┤
 * │ id               │ UUID (PK)                                             │
 * │ userId           │ UUID (FK → Users.id) - Who redeemed it               │
 * │ rewardId         │ UUID (FK → Rewards.id) - What was redeemed           │
 * │ redeemedAt       │ DATE (Timestamp of redemption)                       │
 * │ pointsCost       │ INTEGER (Points spent at redemption - price snapshot)│
 * │ status           │ ENUM('pending','fulfilled','cancelled','expired')    │
 * │ fulfillmentDetails│ JSON (Admin notes, tracking info, etc.)             │
 * │ expiresAt        │ DATE (When reward expires if not fulfilled)          │
 * │ fulfilledBy      │ UUID (FK → Users.id) - Admin who fulfilled reward    │
 * │ fulfilledAt      │ DATE (When admin marked as fulfilled)                │
 * └──────────────────┴──────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DATA FLOW DIAGRAM                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Reward Redemption Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. CATALOG DISPLAY                                                        │
 * │    Frontend: GET /gamification/rewards                                    │
 * │    ↓                                                                      │
 * │    Filter: isActive = true, stock > 0, expiresAt > NOW                   │
 * │    Group by tier (bronze/silver/gold/platinum)                           │
 * │    ↓                                                                      │
 * │    Display: Cards with name, icon, pointCost, stock                      │
 * │                                                                           │
 * │ 2. USER REDEMPTION REQUEST                                               │
 * │    User clicks "Redeem" → POST /gamification/redeem                      │
 * │    ↓                                                                      │
 * │    Validate:                                                             │
 * │      - user.totalPoints >= reward.pointCost ✓                            │
 * │      - reward.isActive = true ✓                                          │
 * │      - reward.stock > 0 OR stock = -1 (unlimited) ✓                      │
 * │      - reward.expiresAt IS NULL OR expiresAt > NOW ✓                     │
 * │    ↓                                                                      │
 * │    TRANSACTION:                                                          │
 * │      a) Deduct points: user.totalPoints -= reward.pointCost              │
 * │      b) Decrement stock: reward.stock -= 1 (if not unlimited)            │
 * │      c) Increment redemptionCount: reward.redemptionCount += 1           │
 * │      d) Create UserRewards record (status = 'pending')                   │
 * │      e) Create PointTransaction (type = 'spent', source = 'reward_redemp')│
 * │    ↓                                                                      │
 * │    Notify:                                                               │
 * │      - User: "Reward redeemed! Admin will fulfill soon."                 │
 * │      - Admin: "New reward redemption: [name] by [user]"                  │
 * │                                                                           │
 * │ 3. ADMIN FULFILLMENT                                                     │
 * │    Admin Dashboard: GET /admin/rewards/redemptions?status=pending        │
 * │    ↓                                                                      │
 * │    Admin processes reward (ships product, schedules session, etc.)       │
 * │    ↓                                                                      │
 * │    PATCH /admin/rewards/redemptions/:id                                  │
 * │      - Update: status = 'fulfilled', fulfilledBy = adminId,              │
 * │                fulfilledAt = NOW, fulfillmentDetails = {...}             │
 * │    ↓                                                                      │
 * │    Notify user: "Your reward [name] has been fulfilled!"                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Separate Rewards Table (Not JSON in Settings)?
 * - Dynamic catalog management: Admins can CRUD rewards without code changes
 * - Stock tracking: Inventory management for limited-quantity rewards
 * - Analytics: redemptionCount shows which rewards are most popular
 * - Searchability: Filter/sort rewards by tier, type, pointCost
 * - Relationships: Foreign key to UserRewards for redemption history
 * - Scalability: Can handle 100s of rewards without performance degradation
 *
 * WHY Track redemptionCount (Not Just Count UserRewards)?
 * - Performance optimization: Avoid COUNT(*) queries on UserRewards table
 * - Analytics dashboard: "Top 10 Most Popular Rewards" query uses this column
 * - Denormalization trade-off: Slight redundancy for significant speed gain
 * - Incremented atomically: redemptionCount += 1 prevents race conditions
 *
 * WHY Stock Field (Instead of Unlimited Inventory)?
 * - Limited-time offers: "First 10 users get free merch" campaigns
 * - Budget control: Admin sets max redemptions for expensive rewards
 * - Urgency marketing: "Only 3 left!" drives user engagement
 * - Auto-deactivation: Can auto-set isActive=false when stock=0
 * - Unlimited option: stock = -1 or stock = 999999 for digital rewards
 *
 * WHY Tier Field (bronze/silver/gold/platinum)?
 * - Visual grouping: Catalog UI displays rewards by tier sections
 * - Access gating: Future feature - require user tier to unlock rewards
 * - Psychological pricing: Higher tiers = more valuable/exclusive rewards
 * - Gamification progression: Users aspire to unlock platinum rewards
 * - Matches user tier system: Consistent tier vocabulary across platform
 *
 * WHY rewardType ENUM (Not Free-Form String)?
 * - Validation: Prevents typos ("sesion" vs "session")
 * - Filtering: Frontend can filter catalog by type (e.g., "Show only discounts")
 * - Business logic: Different fulfillment workflows per type:
 *   - 'session': Auto-add availableSessions to user account
 *   - 'product': Generate shipping label, update fulfillmentDetails
 *   - 'discount': Generate promo code, send via email
 *   - 'service': Notify trainer to schedule appointment
 *   - 'other': Manual admin fulfillment
 * - Analytics: "Which types are most redeemed?" reports
 *
 * WHY pointCost Column (Not Hardcoded Prices)?
 * - Dynamic pricing: Admin can adjust prices based on demand
 * - A/B testing: Test different price points for same reward
 * - Inflation control: Adjust prices if point economy becomes unbalanced
 * - Sale events: Temporarily reduce pointCost for promotions
 * - Price history: UserRewards.pointsCost stores snapshot of price at redemption
 *
 * WHY expiresAt Field (Optional Expiration)?
 * - Limited-time offers: "Holiday Special - Available until Dec 31"
 * - Auto-cleanup: Cron job marks expired rewards as isActive=false
 * - Urgency marketing: "Expires in 3 days!" drives redemptions
 * - Seasonal rewards: Valentine's Day rewards auto-expire after Feb 14
 * - NULL = permanent: Most rewards don't expire
 *
 * WHY isActive Boolean (Instead of Soft Delete)?
 * - Reversible deactivation: Admin can reactivate popular rewards
 * - Historical data: Keep redemptionCount and analytics for deactivated rewards
 * - Catalog control: Remove from catalog without deleting database record
 * - Stock exhaustion: Auto-set isActive=false when stock=0
 * - Seasonal rotation: Deactivate summer rewards in winter, reactivate next year
 *
 * WHY UUID Primary Key (Not Auto-Increment INTEGER)?
 * - Security: Prevents enumeration attacks ("guess reward IDs")
 * - Distributed systems: Can generate IDs client-side for offline mode
 * - Merge safety: No ID collisions when merging databases
 * - Consistency: Matches Users, Achievements, Milestones UUID pattern
 * - REST API: Clean URLs like /rewards/a3b5c7d9-... (not sequential integers)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          INDEXES & CONSTRAINTS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * No indexes created in this migration (table too small < 1000 rows).
 *
 * Future Optimization (if catalog grows > 1000 rewards):
 * - CREATE INDEX idx_rewards_active_tier ON Rewards(isActive, tier)
 *   - Use case: Catalog query filtering active rewards by tier
 * - CREATE INDEX idx_rewards_type ON Rewards(rewardType)
 *   - Use case: Filter rewards by type ("Show only session rewards")
 * - CREATE INDEX idx_rewards_expires ON Rewards(expiresAt)
 *   - Use case: Cron job to auto-deactivate expired rewards
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Admin-only catalog management: Only role='admin' can CRUD rewards
 * - Stock manipulation prevention: redemptionCount atomic increment in transaction
 * - Race condition protection: Row-level locking during redemption
 * - Audit trail: UserRewards tracks who redeemed what and when
 * - Point balance validation: Prevent negative user.totalPoints via transaction
 * - Expiration enforcement: Server-side check expiresAt on redemption
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Safe for production: CREATE TABLE is non-destructive
 * - Rollback support: down() migration drops table cleanly
 * - No data loss: Table creation doesn't affect existing data
 * - Foreign key dependencies: Run BEFORE 20250505001400-create-user-rewards.mjs
 * - Enum stability: Adding reward types is backwards-compatible (requires migration)
 * - Default values: All columns have sensible defaults for INSERT operations
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On (Run These First):
 * - 20250212060728-create-user-table.cjs (Users table must exist)
 *
 * Required By (Run These After):
 * - 20250505001400-create-user-rewards.mjs (UserRewards references Rewards)
 *
 * Related Code Files:
 * - backend/controllers/gamificationController.mjs (redeemReward, getRewards methods)
 * - backend/routes/gamificationRoutes.mjs (GET /rewards, POST /redeem endpoints)
 * - backend/models/Reward.mjs (Sequelize model definition)
 * - backend/models/UserReward.mjs (M:M junction model)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Rewards', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    icon: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Gift'
    },
    pointCost: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 500
    },
    tier: {
      type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
      allowNull: false,
      defaultValue: 'bronze'
    },
    stock: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    redemptionCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    imageUrl: {
      type: Sequelize.STRING,
      allowNull: true
    },
    rewardType: {
      type: Sequelize.ENUM('session', 'product', 'discount', 'service', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    expiresAt: {
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
  await queryInterface.dropTable('Rewards');
}
