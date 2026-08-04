/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        ADD GAMIFICATION FIELDS TO USERS TABLE MIGRATION                   ║
 * ║           (User Point Economy & Tier Progression Extension)              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Extend Users table with gamification columns for point tracking,
 *          tier progression, streak management, and activity analytics
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Users Table Extension Strategy:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Core User Data (Existing) + Gamification Layer (This Migration) = Full  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Gamification Integration Diagram:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                           USERS TABLE                                     │
 * │  ┌────────────────────────────┬──────────────────────────────────────┐  │
 * │  │  Core Identity (Existing)  │  Gamification Layer (New Columns)    │  │
 * │  ├────────────────────────────┼──────────────────────────────────────┤  │
 * │  │ - id (UUID PK)             │ - points (INTEGER)                   │  │
 * │  │ - email                    │ - level (INTEGER)                    │  │
 * │  │ - firstName, lastName      │ - tier (ENUM)                        │  │
 * │  │ - role (ENUM)              │ - streakDays (INTEGER)               │  │
 * │  │ - isActive                 │ - lastActivityDate (DATE)            │  │
 * │  │ - createdAt, updatedAt     │ - totalWorkouts (INTEGER)            │  │
 * │  │                            │ - totalExercises (INTEGER)           │  │
 * │  │                            │ - exercisesCompleted (JSON)          │  │
 * │  │                            │ - badgesPrimary (UUID FK)            │  │
 * │  └────────────────────────────┴──────────────────────────────────────┘  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Tier Progression System:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  Bronze (0-999 pts) → Silver (1000-2499) → Gold (2500-4999) → Platinum  │
 * │  🥉 Starter Tier    → 🥈 Engaged User    → 🥇 Power User   → 💎 Elite   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  DATABASE ERD - GAMIFICATION COLUMNS                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * New Columns Added to Users Table:
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Column Name          │ Type      │ Default │ Purpose                     │
 * ├──────────────────────┼───────────┼─────────┼─────────────────────────────┤
 * │ points               │ INTEGER   │ 0       │ Total points accumulated    │
 * │ level                │ INTEGER   │ 1       │ User experience level       │
 * │ tier                 │ ENUM      │ bronze  │ Current tier status         │
 * │ streakDays           │ INTEGER   │ 0       │ Consecutive login days      │
 * │ lastActivityDate     │ DATE      │ NULL    │ Last engagement timestamp   │
 * │ totalWorkouts        │ INTEGER   │ 0       │ Lifetime workout count      │
 * │ totalExercises       │ INTEGER   │ 0       │ Lifetime exercise count     │
 * │ exercisesCompleted   │ JSON      │ {}      │ Exercise completion map     │
 * │ badgesPrimary        │ UUID FK   │ NULL    │ Featured achievement badge  │
 * └──────────────────────┴───────────┴─────────┴─────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DATA FLOW DIAGRAM                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Gamification Column Update Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. USER COMPLETES WORKOUT                                                 │
 * │    POST /workouts/complete { workoutId: "abc-123" }                       │
 * │    ↓                                                                      │
 * │    BEGIN TRANSACTION;                                                    │
 * │      a) Increment counters:                                              │
 * │         user.totalWorkouts += 1                                          │
 * │         user.totalExercises += workout.exerciseCount                     │
 * │      b) Update activity tracking:                                        │
 * │         user.lastActivityDate = NOW                                      │
 * │      c) Check streak logic:                                              │
 * │         IF (lastActivityDate === yesterday):                             │
 * │           user.streakDays += 1                                           │
 * │         ELSE IF (lastActivityDate !== today):                            │
 * │           user.streakDays = 1  // Reset streak                           │
 * │      d) Award points (via PointTransactions):                            │
 * │         user.points += 50  // Workout completion bonus                   │
 * │      e) Update exercise completion map:                                  │
 * │         user.exercisesCompleted[exerciseId] = {                          │
 * │           completedAt: NOW, reps: 10, sets: 3                            │
 * │         }                                                                │
 * │      f) Check level progression (if points hit threshold)                │
 * │      g) Check tier promotion (via Milestones)                            │
 * │    COMMIT;                                                               │
 * │                                                                           │
 * │ 2. STREAK MAINTENANCE (Daily Cron Job)                                   │
 * │    SELECT * FROM Users WHERE lastActivityDate < YESTERDAY                │
 * │    ↓                                                                      │
 * │    For each inactive user:                                               │
 * │      UPDATE Users SET streakDays = 0 WHERE id = user.id                  │
 * │    ↓                                                                      │
 * │    Send streak broken notification (if streak was > 7 days)              │
 * │                                                                           │
 * │ 3. TIER PROMOTION                                                        │
 * │    User reaches 1000 points → Check Milestones table                     │
 * │    ↓                                                                      │
 * │    Found: "Silver Tier - 1000 Points" milestone                          │
 * │    ↓                                                                      │
 * │    UPDATE Users SET tier = 'silver' WHERE id = user.id                   │
 * │    Award bonus points (+100 for tier promotion)                          │
 * │    ↓                                                                      │
 * │    Notify: "Tier Promotion! You're now Silver Tier! 🥈 +100 pts bonus!"  │
 * │                                                                           │
 * │ 4. BADGE DISPLAY                                                         │
 * │    User earns "100 Workouts" achievement                                 │
 * │    ↓                                                                      │
 * │    User selects as primary badge:                                        │
 * │      PATCH /user/profile { badgesPrimary: achievementId }                │
 * │    ↓                                                                      │
 * │    UPDATE Users SET badgesPrimary = achievementId                        │
 * │    ↓                                                                      │
 * │    Badge displays on user profile card, leaderboards, etc.               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Add to Users Table (Not Separate Gamification Table)?
 * - Query performance: No JOIN needed to display points/tier on every page
 * - Denormalization benefit: User data + gamification data accessed together 99% of time
 * - Atomic updates: user.totalWorkouts += 1 in same transaction as workout creation
 * - API simplicity: GET /user returns all data including gamification stats
 * - Caching efficiency: Single user object cached (not user + gamification objects)
 * - Authentication context: Session includes points/tier for UI rendering
 * - Trade-off: Slightly wider table, but massive performance gain for read-heavy workload
 *
 * WHY points Column (Separate from Level)?
 * - Points are cumulative: Never decrease (except redemptions via PointTransactions)
 * - Level is calculated: Can be derived from points OR set independently
 * - Points track progress: User has 1,250 points toward Silver Tier (1,000 pts)
 * - Level is cosmetic: "You're Level 15!" may not directly correlate to points
 * - Future flexibility: Points can be spent (rewards), levels cannot
 * - Analytics: Track point distribution across user base
 *
 * WHY level Column (If Points Exist)?
 * - Gamification psychology: Levels feel like progression, points feel like currency
 * - XP-style progression: "You need 200 more points to reach Level 16"
 * - Separate from tiers: Level is continuous (1, 2, 3...), tier is categorical (bronze, silver...)
 * - UI display: Show both "Level 15 • Silver Tier 🥈 • 1,250 points"
 * - Custom formulas: Admin can set level = f(points, workouts, achievements)
 * - Future expansion: Could add levelUpBonus, levelThresholds config
 *
 * WHY tier ENUM (bronze, silver, gold, platinum)?
 * - Visual hierarchy: Clear progression with recognizable symbols (🥉🥈🥇💎)
 * - Milestone alignment: Tiers map to Milestones table (targetPoints thresholds)
 * - Permission gating: "Gold Tier only" features (early access, premium content)
 * - Social status: Leaderboards grouped by tier ("Top 10 Platinum Users")
 * - Reward eligibility: "Silver Tier unlocks: Free session discount"
 * - Retention strategy: Users motivated to maintain/upgrade tier status
 * - Enum safety: Database enforces valid tier values
 *
 * WHY streakDays Counter?
 * - Engagement metric: Consecutive daily logins/workouts incentivized
 * - Streak rewards: "7-day streak bonus: +50 points!"
 * - Loss aversion: Users motivated to maintain streak (don't break it!)
 * - Analytics: Track average streak length per user cohort
 * - Notification triggers: "You're on a 14-day streak! Keep it up!"
 * - Leaderboard category: "Longest Streak" competition
 * - Simple integer: Easy to increment/reset (no complex date logic in app code)
 *
 * WHY lastActivityDate (Not Just Use updatedAt)?
 * - Streak calculation: Compare lastActivityDate to today for streak logic
 * - Churn detection: Users with lastActivityDate > 30 days = at-risk
 * - Re-engagement campaigns: Email users with lastActivityDate = 7 days ago
 * - updatedAt changes: Any profile edit triggers updatedAt (not activity-specific)
 * - lastActivityDate only updates: On workout, login, achievement, etc.
 * - Cron job efficiency: SELECT WHERE lastActivityDate < YESTERDAY (break streaks)
 * - NULL handling: New users have NULL (no activity yet) vs updatedAt always set
 *
 * WHY totalWorkouts & totalExercises Counters?
 * - Achievement triggers: "Complete 100 workouts" checked via totalWorkouts >= 100
 * - Analytics dashboard: Show user progress over time
 * - Denormalized performance: No COUNT(*) FROM Workouts WHERE userId = X
 * - Instant access: Display on profile without JOIN/aggregation
 * - Point calculations: Some achievements based on totalExercises count
 * - Leaderboards: ORDER BY totalWorkouts DESC for "Most Active Users"
 * - Eventual consistency: Incremented in transaction with workout creation
 *
 * WHY exercisesCompleted JSON (Not Normalized Table)?
 * - Flexible schema: Store arbitrary exercise metadata without schema changes
 * - Example structure: { "exercise-uuid-1": { completedAt: "2025-01-15", reps: 10, sets: 3, personalRecord: true } }
 * - Query pattern: Check IF exercise-uuid-1 EXISTS in JSON (user tried this exercise)
 * - Personal records: Track user's best performance per exercise
 * - No JOIN overhead: All exercise completion data in user row
 * - Trade-off: Can't efficiently query "All users who completed exercise X" (use WorkoutLogs for that)
 * - Use case: "You've never tried this exercise before! +10 points for variety!"
 *
 * WHY badgesPrimary Foreign Key (Not JSON Array)?
 * - Featured badge: User selects ONE achievement to display prominently
 * - Profile visibility: Shown on user card, leaderboards, comments, etc.
 * - FK integrity: References Achievements.id (ensures badge exists)
 * - NULL allowed: User may choose not to display badge
 * - Future expansion: Could add badgesSecondary, badgesTertiary for multiple slots
 * - Social proof: "This user completed '100 Workouts' achievement 💪"
 * - SET NULL on delete: If achievement deleted, badge disappears gracefully
 *
 * WHY NOT NULL Constraints (With Defaults)?
 * - Data integrity: Prevents NULL errors in calculations (points += X fails if NULL)
 * - Safe initialization: New users start with points=0, level=1, tier=bronze
 * - SQL aggregations: SUM(points) works correctly (NULL excluded from SUM)
 * - Default values: Zero-cost to set defaults in migration (vs app-level defaults)
 * - Migration safety: ADD COLUMN with DEFAULT is non-blocking (no table rewrite on large tables)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          INDEXES & CONSTRAINTS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * No indexes added in this migration (Users table already has PK on id).
 *
 * Future Optimization (if leaderboard queries slow):
 * - CREATE INDEX idx_users_points ON Users(points DESC)
 *   - Use case: Leaderboard "Top 100 users by points"
 * - CREATE INDEX idx_users_tier ON Users(tier)
 *   - Use case: Filter "Show all Platinum users"
 * - CREATE INDEX idx_users_streak ON Users(streakDays DESC)
 *   - Use case: Leaderboard "Longest streaks"
 * - CREATE INDEX idx_users_last_activity ON Users(lastActivityDate)
 *   - Use case: Churn analysis, streak reset cron job
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Server-side updates only: Client cannot POST { points: 9999999 }
 * - Point transactions logged: All point changes tracked in PointTransactions table
 * - Tier promotion validation: Must cross Milestones.targetPoints threshold
 * - Badge FK constraint: User can't set badgesPrimary to fake achievement
 * - Streak reset protection: Cron job (not client) resets streaks
 * - JSON validation: exercisesCompleted structure validated before storage
 * - ENUM enforcement: tier column rejects invalid values at DB level
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Idempotent design: describeTable() checks prevent duplicate column creation
 * - Safe for production: ADD COLUMN with DEFAULT is non-blocking in PostgreSQL
 * - No data loss: Existing user rows get default values (points=0, level=1, etc.)
 * - ENUM type creation: Creates "enum_users_tier" type (catches "already exists" error)
 * - Rollback support: down() migration removes all added columns and ENUM type
 * - Foreign key safety: badgesPrimary references Achievements table (must exist first)
 * - No table lock: PostgreSQL ADD COLUMN with DEFAULT doesn't rewrite table (v11+)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - 20250212060728-create-user-table.cjs (Users table)
 * - 20250505001000-create-achievements.mjs (Achievements table for badgesPrimary FK)
 *
 * Related Code:
 * - backend/models/User.mjs (Sequelize model with gamification fields)
 * - backend/controllers/gamificationController.mjs (point/tier/streak logic)
 * - backend/services/streakService.mjs (daily streak reset cron job)
 *
 * Related Migrations:
 * - 20250505001100-create-rewards.mjs (point redemption)
 * - 20250505001200-create-milestones.mjs (tier promotion)
 * - 20250505001300-create-user-achievements.mjs (achievement tracking)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function up(queryInterface, Sequelize) {
  // Add the tier ENUM type first
  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_users_tier" AS ENUM ('bronze', 'silver', 'gold', 'platinum');
  `).catch(error => {
    // Ignore error if type already exists
    if (error.message.includes('already exists')) {
      console.log('Type "enum_users_tier" already exists, continuing');
    } else {
      throw error;
    }
  });

  // Add gamification columns to the users table
  const columns = [
    {
      column: 'points',
      attributes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      column: 'level',
      attributes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      }
    },
    {
      column: 'tier',
      attributes: {
        type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
        allowNull: false,
        defaultValue: 'bronze'
      }
    },
    {
      column: 'streakDays',
      attributes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      column: 'lastActivityDate',
      attributes: {
        type: Sequelize.DATE,
        allowNull: true
      }
    },
    {
      column: 'totalWorkouts',
      attributes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      column: 'totalExercises',
      attributes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      column: 'exercisesCompleted',
      attributes: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      }
    },
    {
      column: 'badgesPrimary',
      attributes: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Achievements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    }
  ];

  // Add each column
  for (const { column, attributes } of columns) {
    // Check if column already exists
    const tableInfo = await queryInterface.describeTable('Users');
    if (!tableInfo[column]) {
      await queryInterface.addColumn('Users', column, attributes);
    }
  }
}

export async function down(queryInterface, Sequelize) {
  // Remove gamification columns from the users table
  const columns = [
    'points',
    'level',
    'tier',
    'streakDays',
    'lastActivityDate',
    'totalWorkouts',
    'totalExercises',
    'exercisesCompleted',
    'badgesPrimary'
  ];

  for (const column of columns) {
    await queryInterface.removeColumn('Users', column);
  }

  // Remove the tier ENUM type
  await queryInterface.sequelize.query(`
    DROP TYPE IF EXISTS "enum_users_tier";
  `);
}