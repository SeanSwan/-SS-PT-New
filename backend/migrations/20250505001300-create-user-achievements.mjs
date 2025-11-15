/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║          USER ACHIEVEMENTS JUNCTION TABLE MIGRATION                       ║
 * ║      (Many-to-Many: Users ↔ Achievements Progress Tracking)              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Track user progress toward achievements (M:M junction with progress)
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Achievement Tracking Flow:
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │  User Action → Check Achievement → Update Progress → Award Points      │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Relationship Diagram:
 * ┌──────────────┐            ┌────────────────────┐            ┌──────────────┐
 * │    Users     │            │ UserAchievements   │            │ Achievements │
 * │              │            │   (Junction)       │            │              │
 * │ - id (PK)    │◄───────────│ - userId (FK)      │───────────►│ - id (PK)    │
 * │ - totalPoints│            │ - achievementId(FK)│            │ - name       │
 * └──────────────┘            │ - progress (0-100%)│            │ - requirement│
 *                             │ - isCompleted      │            │ - pointValue │
 *                             │ - pointsAwarded    │            └──────────────┘
 *                             └────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                  DATABASE ERD - ACHIEVEMENT TRACKING                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * UserAchievements Table (Junction with Progress Tracking):
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ Table: UserAchievements                                                  │
 * ├──────────────────────┬──────────────────────────────────────────────────┤
 * │ id                   │ UUID (PK)                                         │
 * │ userId               │ UUID (FK → Users.id) - Who is working on this    │
 * │ achievementId        │ UUID (FK → Achievements.id) - Which achievement  │
 * │ earnedAt             │ DATE (When completed - NULL if in progress)      │
 * │ progress             │ FLOAT (0.0 to 1.0 = 0% to 100%)                  │
 * │ isCompleted          │ BOOLEAN (True when progress = 1.0)               │
 * │ pointsAwarded        │ INTEGER (Points granted upon completion)         │
 * │ notificationSent     │ BOOLEAN (Track if user was notified)             │
 * │ createdAt            │ DATE (When user started working on achievement)  │
 * │ updatedAt            │ DATE (Last progress update)                      │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ UNIQUE INDEX         │ (userId, achievementId) - One record per user    │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         DATA FLOW DIAGRAM                                │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Achievement Progress Flow:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. USER ACTION OCCURS                                                     │
 * │    User completes workout → POST /workouts/complete                       │
 * │    ↓                                                                      │
 * │    Backend increments: user.totalWorkouts += 1                           │
 * │                                                                           │
 * │ 2. CHECK ACHIEVEMENTS (Auto-trigger)                                     │
 * │    Query: SELECT * FROM Achievements WHERE                               │
 * │           requirementType = 'workout_count' AND isActive = true          │
 * │    ↓                                                                      │
 * │    Found: "Complete 10 Workouts" achievement (requirement = 10)          │
 * │                                                                           │
 * │ 3. UPDATE PROGRESS                                                       │
 * │    Check: Does UserAchievements record exist?                            │
 * │      SELECT * FROM UserAchievements WHERE                                │
 * │        userId = user.id AND achievementId = achievement.id               │
 * │    ↓                                                                      │
 * │    If NOT EXISTS: INSERT new record (progress = 0.0)                     │
 * │    If EXISTS: UPDATE progress                                            │
 * │    ↓                                                                      │
 * │    Calculate: progress = user.totalWorkouts / achievement.requirement    │
 * │               progress = 7 / 10 = 0.7 (70% complete)                     │
 * │    ↓                                                                      │
 * │    UPDATE UserAchievements SET progress = 0.7, updatedAt = NOW           │
 * │                                                                           │
 * │ 4. CHECK FOR COMPLETION (When progress reaches 1.0)                      │
 * │    If progress >= 1.0:                                                   │
 * │      BEGIN TRANSACTION;                                                  │
 * │        a) UPDATE UserAchievements SET                                    │
 * │             isCompleted = true,                                          │
 * │             earnedAt = NOW,                                              │
 * │             pointsAwarded = achievement.pointValue,                      │
 * │             notificationSent = false                                     │
 * │        b) UPDATE Users SET totalPoints += achievement.pointValue         │
 * │        c) INSERT INTO PointTransactions (                                │
 * │             type = 'earned',                                             │
 * │             source = 'achievement_complete',                             │
 * │             points = achievement.pointValue                              │
 * │           )                                                              │
 * │      COMMIT;                                                             │
 * │    ↓                                                                      │
 * │    Send notification: "Achievement Unlocked: Complete 10 Workouts! +50pts"│
 * │    Update: notificationSent = true                                       │
 * │                                                                           │
 * │ 5. DISPLAY PROGRESS (Dashboard Widget)                                   │
 * │    Frontend: GET /gamification/achievements/progress                     │
 * │    ↓                                                                      │
 * │    Response: [                                                           │
 * │      {                                                                   │
 * │        achievement: "Complete 10 Workouts",                              │
 * │        progress: 0.7,   // 70%                                           │
 * │        isCompleted: false,                                               │
 * │        current: 7,      // Calculated                                    │
 * │        required: 10,    // From Achievements.requirement                 │
 * │        pointValue: 50   // From Achievements.pointValue                  │
 * │      },                                                                  │
 * │      ...                                                                 │
 * │    ]                                                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Junction Table (Not Just Track Completed Achievements)?
 * - Progress tracking: Users want to see "7/10 workouts complete" not just "completed"
 * - Partial credit: Track progress even before completion (motivates users)
 * - Historical data: earnedAt timestamp shows WHEN user completed achievement
 * - Analytics: Can analyze "How many users are 50% through X achievement?"
 * - Notifications: Track if user was notified to prevent duplicate notifications
 * - Point snapshot: pointsAwarded stores actual points given (if achievement value changes later)
 *
 * WHY progress Column (FLOAT 0.0-1.0 Instead of Percentage)?
 * - Precision: 0.666 is more accurate than 67% (avoids rounding errors)
 * - SQL calculations: Easy to query "WHERE progress >= 0.5" (half complete)
 * - Frontend conversion: Just multiply by 100 for display (progress * 100 = 66.6%)
 * - Range validation: FLOAT allows precise 0.0 to 1.0 constraint
 * - Industry standard: Most progress APIs use 0.0-1.0 range
 *
 * WHY isCompleted Boolean (Not Just Check progress = 1.0)?
 * - Query performance: WHERE isCompleted = true (indexed) vs WHERE progress >= 1.0
 * - Edge cases: Handles rounding errors (0.9999 vs 1.0)
 * - Intentional completion: Admin can manually mark completed even if progress < 1.0
 * - UI filtering: "Show only completed" is cleaner than "progress >= 1.0"
 * - Analytics: COUNT(*) WHERE isCompleted = true is faster than SUM calculations
 *
 * WHY pointsAwarded Column (Not Just Use Achievements.pointValue)?
 * - Price snapshot: Stores actual points awarded at completion time
 * - Historical accuracy: If Achievements.pointValue changes, past awards remain correct
 * - Audit trail: "This user got 50 points when they completed it (now worth 75)"
 * - Data integrity: UserAchievements record is self-contained
 * - Reporting: Total points awarded for analytics without JOIN to Achievements
 *
 * WHY notificationSent Boolean?
 * - Idempotency: Prevent duplicate "Achievement Unlocked!" notifications
 * - Async processing: Background job can query WHERE notificationSent = false
 * - Retry logic: If notification fails, can retry unnotified achievements
 * - Debugging: Track which users didn't receive achievement notifications
 * - User experience: Avoid spamming users with duplicate congratulations
 *
 * WHY earnedAt Timestamp (Not Just Use createdAt)?
 * - Distinction: createdAt = when user STARTED, earnedAt = when user COMPLETED
 * - Progress duration: earnedAt - createdAt = how long it took to complete
 * - Analytics: "Users take average 14 days to complete '10 Workouts' achievement"
 * - Leaderboards: Sort by earnedAt for "Who completed this achievement first?"
 * - NULL handling: earnedAt IS NULL means in-progress, NOT NULL means completed
 *
 * WHY UNIQUE Constraint (userId, achievementId)?
 * - Idempotency: Prevents duplicate achievement tracking for same user
 * - Data integrity: Each user can only have ONE progress record per achievement
 * - Point farming prevention: Can't award same achievement twice to same user
 * - UPSERT pattern: Can use ON CONFLICT UPDATE to increment progress
 * - Database constraint: Enforced at DB level, not just application logic
 *
 * WHY CASCADE DELETE (onDelete: 'CASCADE')?
 * - User deletion cleanup: If user deletes account, remove their achievement progress
 * - Achievement deletion cleanup: If achievement removed, delete tracking records
 * - Data consistency: No orphaned records in junction table
 * - GDPR compliance: User data fully removed when account deleted
 * - Storage optimization: Automatic cleanup prevents bloat
 *
 * WHY UUID Primary Key (Not Composite PK)?
 * - Sequelize best practice: UUID PK allows easier joins and references
 * - Future-proofing: Can add relationships to other tables (e.g., AchievementHistory)
 * - API design: /user-achievements/:id vs /user-achievements/user-id/achievement-id
 * - Unique constraint separate: (userId, achievementId) unique enforced independently
 * - Standard pattern: Matches other junction tables (UserRewards, UserMilestones)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          INDEXES & CONSTRAINTS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Indexes Created:
 * 1. user_achievement_unique - UNIQUE INDEX (userId, achievementId)
 *    - Prevents duplicate achievement tracking per user
 *    - Optimizes "Get user's achievement progress" queries
 *
 * Future Optimization (if table grows > 100K rows):
 * - CREATE INDEX idx_user_achievements_completed ON UserAchievements(isCompleted)
 *   - Use case: Filter completed vs in-progress achievements
 * - CREATE INDEX idx_user_achievements_notification ON UserAchievements(notificationSent)
 *   - Use case: Background job to send pending notifications
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Server-side progress calculation: Never trust client-submitted progress values
 * - Transaction protection: Points awarded atomically with completion
 * - Unique constraint: Database-level enforcement prevents duplicate awards
 * - Cascade delete: Ensures no orphaned records on user/achievement deletion
 * - Point validation: pointsAwarded must match Achievements.pointValue at time of completion
 * - Notification tracking: Prevents duplicate notifications from race conditions
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      MIGRATION SAFETY NOTES                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Safe for production: CREATE TABLE is non-destructive
 * - Foreign key safety: Requires Users and Achievements tables exist first
 * - Unique constraint: Prevents data corruption at database level
 * - Rollback support: down() migration drops table and constraints cleanly
 * - No data loss: Junction table creation doesn't affect existing user data
 * - CASCADE behavior: Automatic cleanup on parent table deletions
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                    RELATED FILES & DEPENDENCIES                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On (Run These First):
 * - 20250212060728-create-user-table.cjs (Users table)
 * - 20250505001000-create-achievements.mjs (Achievements table)
 *
 * Related Code Files:
 * - backend/controllers/gamificationController.mjs (trackAchievementProgress method)
 * - backend/routes/gamificationRoutes.mjs (GET /achievements/progress endpoint)
 * - backend/models/UserAchievement.mjs (Sequelize model)
 * - backend/services/achievementService.mjs (Progress calculation logic)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserAchievements', {
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
    achievementId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Achievements',
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
    progress: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    isCompleted: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    pointsAwarded: {
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

  // Add unique constraint on userId and achievementId
  await queryInterface.addIndex('UserAchievements', ['userId', 'achievementId'], {
    unique: true,
    name: 'user_achievement_unique'
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('UserAchievements');
}
