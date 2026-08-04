/**
 * Gamification Settings Migration (Admin-Configurable Point System)
 * ==================================================================
 *
 * Purpose: Creates the GamificationSettings table for admin-controlled gamification
 * configuration including point values, tier thresholds, and feature toggles
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Gamification System
 *
 * Migration Date: 2025-05-05
 *
 * Table Created: GamificationSettings
 *
 * Database ERD (Gamification Ecosystem):
 *
 * ```
 *                        ┌──────────────────────┐
 *                        │ GamificationSettings │ (1 row - global config)
 *                        │      (UUID)          │
 *                        └──────────┬───────────┘
 *                                   │
 *                                   │ (controls)
 *                                   │
 *              ┌────────────────────┼────────────────────┐
 *              │                    │                    │
 *              ▼                    ▼                    ▼
 *      ┌──────────────┐     ┌──────────────┐    ┌──────────────┐
 *      │    users     │     │ achievements │    │   rewards    │
 *      │  (points)    │     │  (unlocks)   │    │  (prizes)    │
 *      └──────┬───────┘     └──────────────┘    └──────────────┘
 *             │
 *             │ (userId)
 *             │
 *      ┌──────▼──────────┐
 *      │ point_transactions│ (audit log)
 *      │     (UUID)       │
 *      └──────────────────┘
 * ```
 *
 * Table Schema (GamificationSettings):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ FIELD                     TYPE        DEFAULT       PURPOSE                  │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ id                        UUID        UUIDV4        Primary key              │
 * │ isEnabled                 BOOLEAN     true          Master toggle            │
 * │ pointsPerWorkout          INTEGER     50            Base workout points      │
 * │ pointsPerExercise         INTEGER     10            Per exercise completed   │
 * │ pointsPerStreak           INTEGER     20            Daily streak bonus       │
 * │ pointsPerLevel            INTEGER     100           Level up requirement     │
 * │ pointsPerReview           INTEGER     15            Session review bonus     │
 * │ pointsPerReferral         INTEGER     200           Referral reward          │
 * │ tierThresholds            JSON        {...}         Bronze/Silver/Gold/Plat  │
 * │ levelRequirements         JSON        null          Custom level gates       │
 * │ pointsMultiplier          FLOAT       1.0           Global point multiplier  │
 * │ enableLeaderboards        BOOLEAN     true          Show leaderboards        │
 * │ enableNotifications       BOOLEAN     true          Push notifications       │
 * │ autoAwardAchievements     BOOLEAN     true          Auto-unlock achievements │
 * │ createdAt                 DATE        NOW()         Creation timestamp       │
 * │ updatedAt                 DATE        NOW()         Last modified            │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Point Economy (Default Values):
 *
 * ```
 * EARNING POINTS:
 * ┌─────────────────────────────────────────────────────┐
 * │ Activity              Points    Frequency           │
 * ├─────────────────────────────────────────────────────┤
 * │ Complete workout      50        Per session         │
 * │ Complete exercise     10        Per exercise        │
 * │ Maintain streak       20        Daily bonus         │
 * │ Write review          15        Per session review  │
 * │ Refer new client      200       Per referral        │
 * └─────────────────────────────────────────────────────┘
 *
 * TIER THRESHOLDS:
 * ┌─────────────────────────────────────────────────────┐
 * │ Tier        Points Required    Estimated Time       │
 * ├─────────────────────────────────────────────────────┤
 * │ Bronze      0                  Day 1                │
 * │ Silver      1,000              ~2 weeks (3x/week)   │
 * │ Gold        5,000              ~2 months            │
 * │ Platinum    20,000             ~6 months            │
 * └─────────────────────────────────────────────────────┘
 *
 * LEVEL PROGRESSION:
 * - 100 points per level (default)
 * - Level 1: 100 points
 * - Level 2: 200 points
 * - Level 10: 1,000 points
 * - Level 100: 10,000 points
 * ```
 *
 * Data Flow (Point Award Workflow):
 *
 * ```
 * 1. CLIENT COMPLETES WORKOUT:
 *    workout_sessions (status='completed') → gamificationController.awardPoints()
 *
 * 2. CALCULATE POINTS:
 *    GamificationSettings (pointsPerWorkout + pointsPerExercise * exerciseCount)
 *    ↓
 *    Apply pointsMultiplier (special events: 2x point weekends)
 *
 * 3. UPDATE USER BALANCE:
 *    users.pointsBalance += calculatedPoints
 *
 * 4. AUDIT LOG:
 *    point_transactions (userId, points, reason, transactionType='earned')
 *
 * 5. CHECK TIER UPGRADE:
 *    IF users.pointsBalance >= tierThresholds.silver THEN users.tier = 'silver'
 *
 * 6. CHECK LEVEL UP:
 *    IF users.pointsBalance % pointsPerLevel === 0 THEN users.level++
 *
 * 7. AUTO-AWARD ACHIEVEMENTS (if enabled):
 *    IF users.level === 10 THEN achievements.unlock('level_10_master')
 * ```
 *
 * Admin Configuration Use Cases:
 *
 * 1. **Promotional Events (2x Points Weekend)**:
 *    UPDATE GamificationSettings SET pointsMultiplier = 2.0
 *
 * 2. **Disable Gamification Temporarily**:
 *    UPDATE GamificationSettings SET isEnabled = false
 *
 * 3. **Adjust Tier Difficulty**:
 *    UPDATE GamificationSettings SET tierThresholds = '{"bronze":0,"silver":500,"gold":2500,"platinum":10000}'
 *
 * 4. **Increase Referral Incentive**:
 *    UPDATE GamificationSettings SET pointsPerReferral = 500
 *
 * 5. **Disable Leaderboards (Privacy Compliance)**:
 *    UPDATE GamificationSettings SET enableLeaderboards = false
 *
 * Foreign Key Relationships:
 * - None (standalone configuration table)
 * - Referenced by gamificationController.mjs for all point calculations
 *
 * Business Logic:
 *
 * WHY Single Row Table (Not Multiple Configurations)?
 * - Only one global gamification configuration needed
 * - Simplifies admin UI (single settings page)
 * - Avoids configuration conflicts (which settings to apply?)
 * - Easier to query (no JOIN required, always id=1)
 * - Future: Add multi-tenant support with organizationId foreign key
 *
 * WHY JSON tierThresholds (Not Separate Columns)?
 * - Flexible tier system (add Diamond/Master tiers without migration)
 * - Frontend can easily parse tier progression UI
 * - Supports custom tier names per organization
 * - PostgreSQL JSON indexing enables fast threshold lookups
 *
 * WHY pointsMultiplier FLOAT (Not INTEGER)?
 * - Supports fractional multipliers (1.5x points, 0.5x points)
 * - Enables fine-grained promotional campaigns (1.25x bonus)
 * - Prevents point inflation (0.75x during high activity periods)
 * - Range: 0.1 (10% points) to 10.0 (10x points)
 *
 * WHY enableLeaderboards Toggle?
 * - Privacy compliance (some clients don't want public ranking)
 * - GDPR compliance (EU users can opt out)
 * - Testing mode (disable during beta)
 * - Soft launch (enable gradually per region)
 *
 * WHY autoAwardAchievements Toggle?
 * - Manual approval workflow (trainer reviews achievements)
 * - Prevent abuse (automatic detection of invalid workouts)
 * - Customization (some gyms prefer manual recognition)
 * - Debugging (disable during testing to prevent spam)
 *
 * WHY pointsPerReview Separate from pointsPerWorkout?
 * - Encourages feedback collection (review is optional)
 * - Lower value than workout (prevent gaming system)
 * - Can be disabled by setting to 0
 * - Aligns with session rating workflow
 *
 * WHY pointsPerReferral So High (200 points)?
 * - Referrals are rare (incentivize word-of-mouth marketing)
 * - Customer acquisition cost justification (cheaper than ads)
 * - Requires verified new client signup (not just invitation)
 * - Equivalent to 4 workouts or 20 exercises
 *
 * Security Model:
 * - Admin-only write access (prevent point manipulation)
 * - Read access for all users (transparent point economy)
 * - Audit log in point_transactions (detect admin changes)
 * - pointsMultiplier max value enforced in application (prevent overflow)
 *
 * Performance Considerations:
 * - Single row table (instant SELECT query)
 * - No indexes needed (1 row only)
 * - JSON fields use PostgreSQL native JSONB parsing
 * - Cached in application memory (redis cache for high traffic)
 *
 * Rollback Strategy:
 * - DROP TABLE GamificationSettings (no foreign key dependencies)
 * - No data migration required (fresh schema creation)
 * - Existing point_transactions table unaffected
 *
 * Dependencies:
 * - No foreign key dependencies
 * - Referenced by gamificationController.mjs
 * - Referenced by point_transactions table (application-level)
 *
 * Future Enhancements:
 * - Add seasonalMultipliers JSON (holiday bonus events)
 * - Add pointsPerSocialShare (Instagram/Facebook shares)
 * - Add tierBenefits JSON (unlock premium features per tier)
 * - Add badgeSystem JSON (custom badge configurations)
 * - Add organizationId foreign key (multi-tenant support)
 *
 * Created: 2025-05-05
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('GamificationSettings', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    isEnabled: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    pointsPerWorkout: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 50
    },
    pointsPerExercise: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    pointsPerStreak: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 20
    },
    pointsPerLevel: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 100
    },
    pointsPerReview: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 15
    },
    pointsPerReferral: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 200
    },
    tierThresholds: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {
        bronze: 0,
        silver: 1000,
        gold: 5000,
        platinum: 20000
      }
    },
    levelRequirements: {
      type: Sequelize.JSON,
      allowNull: true
    },
    pointsMultiplier: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 1.0
    },
    enableLeaderboards: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    enableNotifications: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    autoAwardAchievements: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
  await queryInterface.dropTable('GamificationSettings');
}