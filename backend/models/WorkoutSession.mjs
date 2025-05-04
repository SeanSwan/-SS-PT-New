// backend/models/WorkoutSession.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * WorkoutSession Model
 * Tracks individual workout sessions completed by clients
 * Records performance metrics and level progression
 */
class WorkoutSession extends Model {}

WorkoutSession.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Foreign keys
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
      comment: 'Can be null for one-off workouts'
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
      comment: 'Trainer present during session, if any'
    },
    
    // Session details
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
      comment: 'Duration in minutes'
    },
    
    // Location information
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    
    // Workout details
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
    
    // Session data
    exercisesCompleted: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('exercisesCompleted');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('exercisesCompleted', JSON.stringify(value));
      },
      comment: 'JSON array of completed exercises with performance data'
    },
    
    // Performance metrics
    intensityLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10,
      },
      comment: 'Self-reported intensity level (1-10)'
    },
    difficultyRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10,
      },
      comment: 'Self-reported difficulty level (1-10)'
    },
    enjoymentRating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10,
      },
      comment: 'Self-reported enjoyment level (1-10)'
    },
    
    // Progress tracking
    experiencePointsEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'XP earned from this session'
    },
    levelProgress: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('levelProgress');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('levelProgress', JSON.stringify(value));
      },
      comment: 'JSON object tracking level progress in different categories'
    },
    achievementsUnlocked: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('achievementsUnlocked');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('achievementsUnlocked', JSON.stringify(value));
      },
      comment: 'JSON array of achievements unlocked during this session'
    },
    
    // Notes and feedback
    clientNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes from the client'
    },
    trainerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes from the trainer'
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Feedback from trainer to client'
    },
    
    // Mood and wellness tracking
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
      validate: {
        min: 1,
        max: 10,
      },
    },
    
    // Session status
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
      validate: {
        min: 0,
        max: 100,
      },
    },
    
    // Metrics
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
  },
  {
    sequelize,
    modelName: 'WorkoutSession',
    tableName: 'workout_sessions',
    timestamps: true,
    indexes: [
      {
        fields: ['clientId'],
      },
      {
        fields: ['workoutPlanId'],
      },
      {
        fields: ['date'],
      },
    ],
  }
);

export default WorkoutSession;