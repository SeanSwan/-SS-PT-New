// backend/models/WorkoutPlan.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * WorkoutPlan Model
 * Links clients to exercise protocols based on NASM methodology
 * Allows for personalized training plans based on client level and goals
 */
class WorkoutPlan extends Model {}

WorkoutPlan.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Foreign key to link to User model (clients only)
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
    // Optional: trainer who created this plan
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
    // Plan details
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Plan frequency and duration
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
      validate: {
        min: 1,
        max: 7,
      },
    },
    // NASM Protocol Focus Areas
    // Values 0-100 indicate percentage focus on each area
    coreFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    balanceFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    stabilityFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    flexibilityFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    calisthenicsFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    isolationFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    stabilizersFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    injuryPreventionFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    injuryRecoveryFocus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    
    // Target body areas focus - used to auto-generate workouts
    primaryBodyFocus: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('primaryBodyFocus');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('primaryBodyFocus', JSON.stringify(value));
      },
      comment: 'JSON array of primary body areas to focus on'
    },
    
    // Workout structure and exercises
    workoutStructure: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('workoutStructure');
        return rawValue ? JSON.parse(rawValue) : {};
      },
      set(value) {
        this.setDataValue('workoutStructure', JSON.stringify(value));
      },
      comment: 'JSON structure of the workout plan with days, exercises, sets, reps, etc.'
    },
    
    // Auto-progression settings
    autoProgressionEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether the plan should automatically progress based on client progress'
    },
    progressionRate: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1.0,
      comment: 'Rate multiplier for progression (1.0 = normal, 0.5 = slower, 2.0 = faster)'
    },
    
    // Level targeting - for generating appropriate exercises
    targetLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Target client level for this plan (0-1000)'
    },
    
    // Status
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
    
    // Notes
    trainerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    clientNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    // AI-generated flag
    isAiGenerated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'WorkoutPlan',
    tableName: 'workout_plans',
    timestamps: true,
  }
);

export default WorkoutPlan;