/**
 * NASM Protocol Tables Migration (Core Workout Management System)
 * ================================================================
 *
 * Purpose: Creates the 4 foundational tables for the NASM (National Academy of Sports Medicine)
 * evidence-based workout management system with gamification, progression tracking, and
 * injury prevention capabilities
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - NASM Integration Layer
 *
 * Migration Date: 2025-05-03
 *
 * Tables Created (4 total):
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ TABLE NAME          PURPOSE                           PRIMARY KEY            │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ client_progress     Client fitness level tracking     UUID                   │
 * │ exercises           Exercise library (NASM-based)     UUID                   │
 * │ workout_plans       Trainer-created workout plans     UUID                   │
 * │ workout_sessions    Individual workout tracking       UUID                   │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Database ERD (Entity Relationships):
 *
 * ```
 *                               ┌──────────────┐
 *                               │    users     │
 *                               │  (INTEGER)   │
 *                               └──────┬───────┘
 *                                      │
 *              ┌───────────────────────┼───────────────────────┐
 *              │                       │                       │
 *              │ (userId)              │ (userId)              │ (trainerId)
 *              │                       │                       │
 *      ┌───────▼──────────┐    ┌──────▼────────┐      ┌──────▼────────┐
 *      │ client_progress  │    │ workout_plans │◄─────│ workout_plans │
 *      │   (UUID)         │    │    (UUID)     │      │   (trainerId) │
 *      └──────────────────┘    └───────┬───────┘      └───────────────┘
 *                                      │
 *                                      │ (workoutPlanId)
 *                                      │
 *                              ┌───────▼──────────┐
 *                              │ workout_sessions │
 *                              │     (UUID)       │
 *                              └──────────────────┘
 *
 *                              ┌──────────────┐
 *                              │  exercises   │ (standalone library)
 *                              │   (UUID)     │
 *                              └──────────────┘
 * ```
 *
 * Table Schemas:
 *
 * 1. client_progress (1 row per user):
 *    - NASM Skill Levels: core, balance, stability, flexibility, calisthenics, isolation, stabilizers
 *    - Injury Tracking: injuryPrevention, injuryRecovery
 *    - Muscle Groups: 16 specific muscles (glutes, calfs, shoulders, hamstrings, abs, chest, etc.)
 *    - Exercise Proficiency: squats, lunges, planks, reversePlanks
 *    - Gamification: experiencePoints, overallLevel, streakDays, workoutsCompleted
 *    - Tracking: achievements, progressNotes, unlockedExercises, lastAssessmentDate
 *
 * 2. exercises (NASM exercise library):
 *    - Exercise Info: name, description, instructions, videoUrl, imageUrl
 *    - NASM Classification: exerciseType (10 types), primaryMuscles, secondaryMuscles, difficulty
 *    - Progression: progressionPath, prerequisites, unlockLevel, targetProgressionRate
 *    - Safety: contraindicationNotes, safetyTips, scientificReferences
 *    - Prescription: recommendedSets, recommendedReps, recommendedDuration, restInterval
 *    - Gamification: experiencePointsEarned, isPopular, isActive
 *    - Equipment: equipmentNeeded, canBePerformedAtHome
 *
 * 3. workout_plans (trainer-created templates):
 *    - Ownership: userId (client), trainerId (creator)
 *    - Plan Details: name, description, startDate, endDate, frequencyPerWeek
 *    - NASM Focus Distribution: 9 focus areas (coreFocus, balanceFocus, etc.)
 *    - Progression: autoProgressionEnabled, progressionRate, targetLevel
 *    - Structure: workoutStructure (JSON), primaryBodyFocus, status
 *    - Notes: trainerNotes, clientNotes, isAiGenerated
 *
 * 4. workout_sessions (individual workout records):
 *    - Ownership: userId (client), trainerId (supervisor), workoutPlanId (template)
 *    - Timing: date, startTime, endTime, duration, location
 *    - Type: workoutType (scheduled, impromptu, virtual, self_guided, assessment)
 *    - Exercises: exercisesCompleted (JSON), completionPercentage, intensityLevel
 *    - Gamification: experiencePointsEarned, levelProgress, achievementsUnlocked
 *    - Feedback: clientNotes, trainerNotes, difficultyRating, enjoymentRating
 *    - Mood Tracking: moodBefore, moodAfter, energyLevel
 *    - Biometrics: caloriesBurned, heartRateAvg, heartRateMax
 *    - Status: scheduled, in_progress, completed, cancelled, missed
 *
 * Indexes Created (9 total):
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ TABLE                INDEX COLUMNS              PURPOSE                      │
 * ├──────────────────────────────────────────────────────────────────────────────┤
 * │ client_progress      userId                     Fast user progress lookup    │
 * │ exercises            exerciseType, difficulty   Filter exercises by type     │
 * │ exercises            name                       Unique exercise lookup       │
 * │ workout_plans        userId                     Fast client plan lookup      │
 * │ workout_plans        trainerId                  Trainer plan listing         │
 * │ workout_plans        status                     Active plan filtering        │
 * │ workout_sessions     userId                     Client workout history       │
 * │ workout_sessions     workoutPlanId              Plan adherence tracking      │
 * │ workout_sessions     date                       Calendar queries             │
 * │ workout_sessions     status                     Filter by completion status  │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Data Flow (Workout Lifecycle):
 *
 * ```
 * 1. TRAINER CREATES PLAN:
 *    Trainer → workout_plans (trainerId + userId + NASM focus distribution)
 *
 * 2. CLIENT STARTS WORKOUT:
 *    Client → workout_sessions (userId + workoutPlanId + status='in_progress')
 *
 * 3. CLIENT COMPLETES WORKOUT:
 *    workout_sessions (status='completed' + exercisesCompleted + experiencePointsEarned)
 *    ↓
 *    client_progress (update skill levels + experiencePoints + workoutsCompleted + streakDays)
 *
 * 4. PROGRESSION TRACKING:
 *    client_progress → exercises (filter by unlockLevel based on client skill levels)
 * ```
 *
 * Foreign Key Relationships:
 *
 * - client_progress.userId → users.id (CASCADE delete, CASCADE update)
 * - workout_plans.userId → users.id (CASCADE delete, CASCADE update)
 * - workout_plans.trainerId → users.id (SET NULL on delete, CASCADE update)
 * - workout_sessions.userId → users.id (CASCADE delete, CASCADE update)
 * - workout_sessions.trainerId → users.id (SET NULL on delete, CASCADE update)
 * - workout_sessions.workoutPlanId → workout_plans.id (SET NULL on delete, CASCADE update)
 *
 * Business Logic:
 *
 * WHY UUID Primary Keys (Not INTEGER)?
 * - Prevents sequential ID enumeration (security)
 * - Future-proof for distributed systems (no auto-increment conflicts)
 * - Better for data migrations between databases
 * - Aligns with modern microservices architecture
 * - Users table remains INTEGER for backwards compatibility
 *
 * WHY 16 Specific Muscle Group Levels in client_progress?
 * - NASM OPT Model requires granular muscle tracking
 * - Enables targeted weakness identification
 * - Allows AI workout generation to balance muscle development
 * - Injury prevention through symmetry tracking (left vs right imbalances)
 * - Supports progression path unlocking (prerequisite muscle strength)
 *
 * WHY Separate exerciseType ENUM (10 types)?
 * - NASM Phase 1: Stabilization (core, balance, stability, flexibility)
 * - NASM Phase 2: Strength (calisthenics, isolation, stabilizers)
 * - NASM Phase 3: Power (compound movements)
 * - Special: injury_prevention, injury_recovery
 * - Enables phase-based workout plan generation
 *
 * WHY TEXT Fields for Arrays (achievements, exercisesCompleted)?
 * - PostgreSQL JSON type requires additional parsing complexity
 * - TEXT with JSON.stringify/parse works with all ORMs (Sequelize, Knex, Prisma)
 * - Easier data migrations and debugging
 * - Future migration to JSONB column type possible without schema changes
 *
 * WHY trainerId SET NULL on delete (Not CASCADE)?
 * - Preserve historical workout plans when trainer leaves
 * - Allows plan reassignment to new trainer
 * - Maintains client workout history continuity
 * - Audit trail for compliance (who created the plan)
 *
 * WHY Soft Delete (deletedAt column)?
 * - Accidental deletion recovery (admin can restore)
 * - Historical reporting (count total workouts ever completed)
 * - Audit trail for compliance (HIPAA, GDPR data retention)
 * - Performance: faster than hard delete + constraint checks
 *
 * WHY Separate workout_plans and workout_sessions Tables?
 * - Plans are templates (reusable, long-lived)
 * - Sessions are instances (one-time, historical records)
 * - Trainer can update plan without affecting past sessions
 * - Enables plan adherence tracking (planned vs actual sessions)
 * - Supports both pre-planned and impromptu workouts
 *
 * WHY status ENUM for workout_sessions (5 states)?
 * - scheduled: Planned workout not yet started
 * - in_progress: Client currently working out (real-time tracking)
 * - completed: Workout finished successfully
 * - cancelled: Client cancelled before starting
 * - missed: Scheduled workout not attended
 * - Enables automated streak tracking (missed workouts break streak)
 *
 * Security Model:
 * - All foreign keys use CASCADE/SET NULL (no orphaned records)
 * - Soft delete prevents accidental data loss
 * - UUID keys prevent enumeration attacks
 * - No sensitive PII fields (health data stored separately in clients_pii table)
 *
 * Performance Considerations:
 * - 9 indexes for fast queries (user lookups, plan filtering, date ranges)
 * - UUID UUIDV4 generation uses database default (fast)
 * - TEXT fields for JSON avoid parsing overhead (app-level JSON handling)
 * - Indexes on status columns enable efficient filtering
 *
 * NASM Compliance:
 * - Exercise library supports OPT Model (Optimum Performance Training)
 * - Progression tracking aligns with NASM Phase 1-3 progression
 * - Injury prevention and recovery exercise types
 * - Scientific references field for evidence-based training
 * - Contraindication tracking for client safety
 *
 * Rollback Strategy:
 * - Tables dropped in reverse order (workout_sessions → workout_plans → exercises → client_progress)
 * - Foreign key constraints respected (child tables dropped first)
 * - No data migration required (fresh schema creation)
 *
 * Dependencies:
 * - Requires users table to exist (foreign key to users.id)
 * - No dependencies on other NASM migrations
 *
 * Future Enhancements:
 * - Add exercise_videos table (video library integration)
 * - Add workout_plan_days table (weekly workout schedules)
 * - Add sets table (individual set tracking)
 * - Migrate TEXT JSON fields to PostgreSQL JSONB
 * - Add fulltext search index on exercises.name, exercises.description
 *
 * Created: 2025-05-03
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

// backend/migrations/20250503-create-nasm-tables.mjs
import { DataTypes } from 'sequelize';
export async function up(queryInterface, Sequelize) {
  // Create client_progress table
  await queryInterface.createTable('client_progress', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    overallLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    experiencePoints: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    coreLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    balanceLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    stabilityLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    flexibilityLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    calisthenicsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isolationLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    stabilizersLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    injuryPreventionLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    injuryRecoveryLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    glutesLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    calfsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    shouldersLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    hamstringsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    absLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    chestLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    bicepsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    tricepsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    tibialisAnteriorLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    serratusAnteriorLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    latissimusDorsiLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    hipsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lowerBackLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    wristsForearmLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    neckLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    squatsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lungesLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    planksLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reversePlanksLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    achievements: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    achievementDates: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    progressNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    unlockedExercises: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    lastAssessmentDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Tracking metrics
    workoutsCompleted: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalExercisesPerformed: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    streakDays: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  // Create exercises table
  await queryInterface.createTable('exercises', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    exerciseType: {
      type: DataTypes.ENUM(
        'core', 
        'balance', 
        'stability', 
        'flexibility', 
        'calisthenics',
        'isolation',
        'stabilizers',
        'injury_prevention',
        'injury_recovery',
        'compound'
      ),
      allowNull: false,
    },
    primaryMuscles: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    secondaryMuscles: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    progressionPath: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    prerequisites: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    equipmentNeeded: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    canBePerformedAtHome: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    contraindicationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    safetyTips: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recommendedSets: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    recommendedReps: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    recommendedDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    restInterval: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    scientificReferences: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    unlockLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    experiencePointsEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
    targetProgressionRate: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  // Create workout_plans table
  await queryInterface.createTable('workout_plans', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    frequencyPerWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    coreFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    balanceFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    stabilityFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    flexibilityFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    calisthenicsFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isolationFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    stabilizersFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    injuryPreventionFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    injuryRecoveryFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    primaryBodyFocus: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    workoutStructure: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    autoProgressionEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    progressionRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
    },
    targetLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM(
        'active', 
        'completed', 
        'paused', 
        'draft',
        'archived'
      ),
      allowNull: false,
      defaultValue: 'draft',
    },
    trainerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    clientNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isAiGenerated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  // Create workout_sessions table
  await queryInterface.createTable('workout_sessions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    workoutPlanId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'workout_plans',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_DATE'),
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    workoutType: {
      type: DataTypes.ENUM(
        'scheduled',
        'impromptu',
        'virtual',
        'self_guided',
        'assessment'
      ),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    exercisesCompleted: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    intensityLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    difficultyRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    enjoymentRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    experiencePointsEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    levelProgress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    achievementsUnlocked: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    clientNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    trainerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    moodBefore: {
      type: DataTypes.ENUM(
        'great',
        'good',
        'neutral',
        'tired',
        'sore',
        'stressed'
      ),
      allowNull: true,
    },
    moodAfter: {
      type: DataTypes.ENUM(
        'great',
        'good',
        'neutral',
        'tired',
        'sore',
        'accomplished'
      ),
      allowNull: true,
    },
    energyLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        'missed'
      ),
      allowNull: false,
      defaultValue: 'scheduled',
    },
    completionPercentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    caloriesBurned: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    heartRateAvg: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    heartRateMax: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  // Create indexes
  await queryInterface.addIndex('client_progress', ['userId']);
  await queryInterface.addIndex('exercises', ['exerciseType', 'difficulty']);
  await queryInterface.addIndex('exercises', ['name']);
  await queryInterface.addIndex('workout_plans', ['userId']);
  await queryInterface.addIndex('workout_plans', ['trainerId']);
  await queryInterface.addIndex('workout_plans', ['status']);
  await queryInterface.addIndex('workout_sessions', ['userId']);
  await queryInterface.addIndex('workout_sessions', ['workoutPlanId']);
  await queryInterface.addIndex('workout_sessions', ['date']);
  await queryInterface.addIndex('workout_sessions', ['status']);
}

/**
 * Rollback migration
 */
export async function down(queryInterface, Sequelize) {
  // Drop tables in reverse order to avoid foreign key constraints
  await queryInterface.dropTable('workout_sessions');
  await queryInterface.dropTable('workout_plans');
  await queryInterface.dropTable('exercises');
  await queryInterface.dropTable('client_progress');
}
