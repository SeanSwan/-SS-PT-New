// backend/migrations/20250503-create-nasm-tables.mjs
import { DataTypes } from 'sequelize';

/**
 * Migration to create the necessary tables for the NASM protocol system:
 * - client_progress
 * - exercises
 * - workout_plans
 * - workout_sessions
 */
export async function up(queryInterface, Sequelize) {
  // Create client_progress table
  await queryInterface.createTable('client_progress', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
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
    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    trainerId: {
      type: DataTypes.UUID,
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
    clientId: {
      type: DataTypes.UUID,
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
      type: DataTypes.UUID,
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
  await queryInterface.addIndex('workout_plans', ['clientId']);
  await queryInterface.addIndex('workout_plans', ['trainerId']);
  await queryInterface.addIndex('workout_plans', ['status']);
  await queryInterface.addIndex('workout_sessions', ['clientId']);
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
