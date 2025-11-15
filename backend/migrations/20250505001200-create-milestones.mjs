/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║            GAMIFICATION MILESTONES (TIER GOALS) MIGRATION                 ║
 * ║                 SwanStudios Gamification System                           ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Create Milestones table - cumulative point goals for tier promotion
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Gamification Tier Progression Architecture:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  User earns points → Crosses milestone threshold → Tier promotion        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Flow:
 * ┌───────────────┐      ┌──────────────┐      ┌─────────────────┐
 * │ User Actions  │─────▶│    Points    │─────▶│   Milestones    │
 * │ (workouts,    │      │ Accumulate   │      │   (Tier Goals)  │
 * │  sessions,    │      │              │      │                 │
 * │  engagement)  │      └──────────────┘      └─────────────────┘
 * └───────────────┘                                     │
 *                                                       ▼
 *                              ┌──────────────────────────────────┐
 *                              │  User.totalPoints >= targetPoints │
 *                              │            ?                      │
 *                              └──────────────────────────────────┘
 *                                     │                    │
 *                                YES  │                    │ NO
 *                                     ▼                    ▼
 *                         ┌──────────────────┐    ┌──────────────┐
 *                         │ Promote to Tier  │    │ Keep current │
 *                         │ Award bonus pts  │    │ tier, show   │
 *                         │ Create UserMiles │    │ progress bar │
 *                         │ Notify user      │    └──────────────┘
 *                         └──────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  DATABASE ERD - MILESTONES ECOSYSTEM                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Milestones Table (Tier Goals):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Table: Milestones                                                        │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ id                   │ UUID (PK)                                         │
 * │ name                 │ STRING (e.g., "Silver Tier - 1000 Points")       │
 * │ description          │ TEXT (Benefits of reaching this milestone)       │
 * │ targetPoints         │ INTEGER (e.g., 1000 - cumulative total required) │
 * │ tier                 │ ENUM('bronze','silver','gold','platinum')        │
 * │ bonusPoints          │ INTEGER (Bonus awarded upon reaching milestone)  │
 * │ icon                 │ STRING (Default: 'Star')                         │
 * │ isActive             │ BOOLEAN (Admin can deactivate milestones)        │
 * │ imageUrl             │ STRING (Optional badge/trophy image)             │
 * │ requiredForPromotion │ BOOLEAN (Must complete to unlock next tier?)     │
 * │ createdAt            │ DATE (Auto-managed)                              │
 * │ updatedAt            │ DATE (Auto-managed)                              │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * Related Tables:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ UserMilestones (M:M Junction - Milestone Completion Tracking)           │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ id                   │ UUID (PK)                                         │
 * │ userId               │ UUID (FK → Users.id) - Who reached the milestone │
 * │ milestoneId          │ UUID (FK → Milestones.id) - Which milestone      │
 * │ reachedAt            │ DATE (Timestamp when user hit targetPoints)      │
 * │ bonusPointsAwarded   │ INTEGER (Bonus points granted - price snapshot)  │
 * │ notificationSent     │ BOOLEAN (Track if user was notified)             │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Users Table (Gamification Fields)                                        │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ id                   │ UUID (PK)                                         │
 * │ totalPoints          │ INTEGER (Cumulative points earned)               │
 * │ currentTier          │ ENUM('bronze','silver','gold','platinum')        │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DATA FLOW DIAGRAM                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Tier Promotion Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. USER EARNS POINTS                                                      │
 * │    User completes workout → POST /gamification/log-activity               │
 * │    ↓                                                                      │
 * │    Award points: user.totalPoints += 50 (workout completion)              │
 * │    Create PointTransaction record                                        │
 * │                                                                           │
 * │ 2. CHECK MILESTONE ELIGIBILITY                                           │
 * │    Query: SELECT * FROM Milestones WHERE                                 │
 * │           targetPoints <= user.totalPoints AND                           │
 * │           tier > user.currentTier AND                                    │
 * │           isActive = true                                                │
 * │           ORDER BY targetPoints ASC LIMIT 1                              │
 * │    ↓                                                                      │
 * │    Found milestone? Check if already reached:                            │
 * │      SELECT * FROM UserMilestones WHERE                                  │
 * │        userId = user.id AND milestoneId = milestone.id                   │
 * │    ↓                                                                      │
 * │    If NOT already reached, proceed to promotion                          │
 * │                                                                           │
 * │ 3. TIER PROMOTION (Transaction-protected)                                │
 * │    BEGIN TRANSACTION;                                                    │
 * │      a) Update user tier: user.currentTier = milestone.tier              │
 * │      b) Award bonus points: user.totalPoints += milestone.bonusPoints    │
 * │      c) Create UserMilestones record (reachedAt = NOW)                   │
 * │      d) Create PointTransaction (type='earned', source='milestone_bonus')│
 * │    COMMIT;                                                               │
 * │    ↓                                                                      │
 * │    Notify user:                                                          │
 * │      - "Congratulations! You've reached [Silver Tier]!"                  │
 * │      - "Bonus: +100 points awarded!"                                     │
 * │      - Badge animation on frontend                                       │
 * │                                                                           │
 * │ 4. DISPLAY PROGRESS (Dashboard Widget)                                   │
 * │    Current: user.totalPoints = 1200                                      │
 * │    Next Milestone: Gold Tier (targetPoints = 2500)                       │
 * │    Progress: 1200 / 2500 = 48% complete                                  │
 * │    ↓                                                                      │
 * │    Display: Progress bar showing 48% filled                              │
 * │             "1,300 more points to Gold Tier!"                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Separate Milestones Table (Not Hardcoded Tier Thresholds)?
 * - Dynamic configuration: Admin can adjust targetPoints without code changes
 * - Multiple milestones per tier: Can have "Silver I", "Silver II", "Silver III"
 * - Bonus variety: Different milestones award different bonusPoints
 * - A/B testing: Test different point thresholds for tier promotions
 * - Historical tracking: UserMilestones tracks all reached milestones over time
 * - Future features: Add seasonal milestones, special event milestones
 *
 * WHY targetPoints (Cumulative, Not Incremental)?
 * - Simplicity: Easy comparison (user.totalPoints >= milestone.targetPoints)
 * - Progress bar calculation: (current / target) * 100 = % complete
 * - No complex math: Avoid "sum all previous milestones" calculations
 * - User psychology: "I have 1,200 points" is clearer than "800 points to next tier"
 * - SQL efficiency: Single integer comparison, no aggregation needed
 *
 * WHY bonusPoints (Reward for Reaching Milestone)?
 * - Positive reinforcement: Celebrate user achievement with immediate reward
 * - Progression boost: Helps users reach NEXT milestone faster
 * - Marketing: "Reach Silver Tier and get 100 bonus points!"
 * - Retention: Milestone bonuses incentivize continued engagement
 * - Variable rewards: Higher tiers can award larger bonuses (Platinum = 500 pts)
 *
 * WHY requiredForPromotion Boolean?
 * - Gating mechanism: Can require specific milestones (e.g., "Complete 10 workouts")
 * - Mixed requirements: Points + specific achievements = tier promotion
 * - Future features: "You need 1000 points AND complete the Fitness Challenge"
 * - Prevents point farming: Can't just game points to skip tier requirements
 * - Example: "Silver Tier requires 1000 points AND completing First Workout milestone"
 *
 * WHY tier Field (bronze/silver/gold/platinum)?
 * - Tier association: Each milestone unlocks a specific tier
 * - Visual grouping: Dashboard shows "Path to Gold Tier" with 3 milestones
 * - Validation: Prevent users from skipping tiers (must complete Bronze before Silver)
 * - Query optimization: "Get all milestones for next tier" filters by tier enum
 * - Matches User.currentTier: Consistent tier vocabulary across system
 *
 * WHY isActive Boolean (Not Soft Delete)?
 * - Seasonal milestones: Deactivate "Summer Challenge" after summer ends
 * - Event milestones: Activate "Holiday Special" milestone only in December
 * - A/B testing: Activate/deactivate different milestone configurations
 * - Historical data: Keep UserMilestones records even if milestone is deactivated
 * - Reversible: Can reactivate popular milestones for recurring events
 *
 * WHY imageUrl Field (Optional Visual Asset)?
 * - Badge display: Show trophy/badge icon when user reaches milestone
 * - Social sharing: "I just reached Gold Tier! 🏆" with badge image
 * - Gamification appeal: Visual rewards more engaging than text notifications
 * - Customization: Different badge designs for different tiers
 * - NULL for simple milestones: Not all milestones need images
 *
 * WHY icon Field (Default: 'Star')?
 * - Fallback visual: If imageUrl is NULL, use Material UI icon name
 * - Lightweight: Icon names are strings, not images (faster load)
 * - Consistent styling: Use app's icon library instead of custom assets
 * - Examples: 'Star' (default), 'EmojiEvents' (trophy), 'WorkspacePremium' (badge)
 *
 * WHY UUID Primary Key (Not Auto-Increment INTEGER)?
 * - Security: Prevents milestone ID enumeration attacks
 * - Distributed systems: Can create milestones offline without ID conflicts
 * - Consistency: Matches Users, Achievements, Rewards UUID pattern
 * - API cleanliness: /milestones/a3b5c7d9-... vs /milestones/1
 * - Merge safety: No ID collisions when merging dev/staging databases
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          INDEXES & CONSTRAINTS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * No indexes created in this migration (table too small < 100 rows).
 *
 * Future Optimization (if milestone catalog grows):
 * - CREATE INDEX idx_milestones_tier ON Milestones(tier, targetPoints)
 *   - Use case: Query "Get all milestones for Silver tier ordered by points"
 * - CREATE INDEX idx_milestones_active ON Milestones(isActive)
 *   - Use case: Filter active vs inactive milestones
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Admin-only management: Only role='admin' can CRUD milestones
 * - Automatic promotion: Server-side tier promotion prevents client manipulation
 * - Transaction protection: Milestone reaching is atomic (all-or-nothing)
 * - Idempotency: UserMilestones unique constraint prevents duplicate bonuses
 * - Tier validation: Cannot skip tiers (must progress bronze → silver → gold)
 * - Point validation: bonusPoints cannot be negative
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Safe for production: CREATE TABLE is non-destructive
 * - Rollback support: down() migration drops table cleanly
 * - No data loss: Table creation doesn't affect existing data
 * - Foreign key dependencies: Run BEFORE 20250505001500-create-user-milestones.mjs
 * - Enum stability: Tier enum must match Users.currentTier enum exactly
 * - Default values: All required columns have sensible defaults
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On (Run These First):
 * - 20250212060728-create-user-table.cjs (Users table must exist)
 * - 20250505001800-add-gamification-fields-to-users.mjs (currentTier, totalPoints)
 *
 * Required By (Run These After):
 * - 20250505001500-create-user-milestones.mjs (UserMilestones references Milestones)
 *
 * Related Code Files:
 * - backend/controllers/gamificationController.mjs (checkMilestones, promoteTier methods)
 * - backend/routes/gamificationRoutes.mjs (GET /milestones endpoint)
 * - backend/models/Milestone.mjs (Sequelize model definition)
 * - backend/models/UserMilestone.mjs (M:M junction model)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Milestones', {
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
    targetPoints: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    tier: {
      type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
      allowNull: false,
      defaultValue: 'bronze'
    },
    bonusPoints: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 100
    },
    icon: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Star'
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    imageUrl: {
      type: Sequelize.STRING,
      allowNull: true
    },
    requiredForPromotion: {
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
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('Milestones');
}
