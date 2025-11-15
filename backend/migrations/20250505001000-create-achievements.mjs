/**
 * Achievements Migration (Gamification Unlock System)
 * ====================================================
 *
 * Purpose: Creates the Achievements table for milestone-based rewards with
 * 9 requirement types, tier-based progression, and exercise-specific achievements
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Gamification System
 *
 * Migration Date: 2025-05-05
 *
 * Table Created: Achievements
 *
 * Database ERD:
 * ```
 *      ┌──────────────────────┐
 *      │ GamificationSettings │ (controls autoAwardAchievements)
 *      └──────────────────────┘
 *
 *      ┌──────────────┐                    ┌──────────────┐
 *      │ Achievements │◄───────────────────│  Exercises   │
 *      │   (UUID)     │  (exerciseId FK)   │    (UUID)    │
 *      └──────┬───────┘                    └──────────────┘
 *             │
 *             │ (achievementId)
 *             │
 *      ┌──────▼──────────────┐
 *      │ user_achievements   │ (join table)
 *      │      (UUID)         │
 *      └─────────────────────┘
 * ```
 *
 * Requirement Types (9 total):
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ TYPE                  DESCRIPTION                      EXAMPLE               │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ session_count         Complete N workouts              requirementValue: 10  │
 * │ exercise_count        Perform N exercises              requirementValue: 50  │
 * │ level_reached         Reach level N                    requirementValue: 5   │
 * │ specific_exercise     Master exercise (exerciseId FK)  requirementValue: 1   │
 * │ streak_days           Maintain N-day streak            requirementValue: 7   │
 * │ workout_time          Total minutes worked out         requirementValue: 600 │
 * │ invite_friend         Refer N friends                  requirementValue: 3   │
 * │ purchase_package      Buy training package             requirementValue: 1   │
 * │ complete_assessment   Finish NASM assessment           requirementValue: 1   │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Tier System:
 * - Bronze: Beginner achievements (1-10 sessions, 7-day streak)
 * - Silver: Intermediate achievements (25 sessions, 30-day streak)
 * - Gold: Advanced achievements (50+ sessions, specific exercises mastered)
 * - Platinum: Elite achievements (100+ sessions, all assessments complete)
 *
 * Data Flow (Achievement Unlock):
 * ```
 * 1. CLIENT COMPLETES ACTION:
 *    workout_sessions.status='completed' → gamificationController.checkAchievements()
 *
 * 2. QUERY MATCHING ACHIEVEMENTS:
 *    SELECT * FROM Achievements WHERE requirementType='session_count'
 *
 * 3. CHECK IF CRITERIA MET:
 *    IF user.workoutsCompleted >= achievement.requirementValue THEN unlock
 *
 * 4. AWARD ACHIEVEMENT:
 *    INSERT INTO user_achievements (userId, achievementId, unlockedAt)
 *
 * 5. AWARD POINTS:
 *    users.pointsBalance += achievement.pointValue
 *
 * 6. SEND NOTIFICATION:
 *    notifications.create({ title: "Achievement Unlocked!", type: "achievement" })
 * ```
 *
 * Business Logic:
 *
 * WHY exerciseId Foreign Key (Optional)?
 * - specific_exercise achievement type requires exercise reference
 * - Example: "Unlock Plank Master" (must complete plank exercise 50 times)
 * - SET NULL on delete (preserve achievement even if exercise removed)
 * - Other 8 requirement types don't need exerciseId
 *
 * WHY specificRequirement JSON Field?
 * - Complex achievement criteria (multiple exercises, time windows, combos)
 * - Example: {"exercises": ["uuid1", "uuid2"], "within_days": 30}
 * - "Complete 3 different leg exercises in one week"
 * - Flexible schema without additional migrations
 *
 * WHY pointValue Separate from GamificationSettings?
 * - Each achievement has different value (Bronze = 100, Platinum = 1000)
 * - Rare achievements worth more points
 * - Time-limited events can have bonus pointValue
 * - GamificationSettings.pointsPerLevel is different (level progression)
 *
 * WHY isActive Toggle?
 * - Seasonal achievements (disable after event ends)
 * - Deprecated achievements (replaced with new version)
 * - Testing mode (create draft achievements)
 * - Soft delete (preserve unlocked history)
 *
 * WHY Tier Matches GamificationSettings tierThresholds?
 * - Consistent tier branding across platform
 * - Unlocking Gold achievement feels premium
 * - UI can filter achievements by tier
 * - Achievement rarity matches tier progression
 *
 * Security Model:
 * - Read access for all users (public achievement list)
 * - Admin-only write access (prevent achievement manipulation)
 * - Foreign key to exercises (exercise-specific achievements)
 *
 * Rollback Strategy:
 * - DROP TABLE Achievements (user_achievements will be orphaned - drop that first)
 *
 * Dependencies:
 * - Exercises table (optional FK for specific_exercise type)
 * - users table (application-level relationship)
 * - user_achievements table (join table)
 *
 * Created: 2025-05-05
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Achievements', {
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
      defaultValue: 'Award'
    },
    pointValue: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 100
    },
    requirementType: {
      type: Sequelize.ENUM('session_count', 'exercise_count', 'level_reached', 'specific_exercise', 'streak_days', 'workout_time', 'invite_friend', 'purchase_package', 'complete_assessment'),
      allowNull: false
    },
    requirementValue: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    tier: {
      type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
      allowNull: false,
      defaultValue: 'bronze'
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    exerciseId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Exercises',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    specificRequirement: {
      type: Sequelize.JSON,
      allowNull: true
    },
    badgeImageUrl: {
      type: Sequelize.STRING,
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
  await queryInterface.dropTable('Achievements');
}