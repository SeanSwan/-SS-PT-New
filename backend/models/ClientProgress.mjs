// backend/models/ClientProgress.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * Client Progress Model
 * Tracks client progression through NASM-based protocol levels
 * Provides gamification and level tracking (0-1000) across different exercise categories
 */
class ClientProgress extends Model {}

ClientProgress.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Foreign key to link to User model (clients only)
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
    // Overall progression level (0-1000)
    overallLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Client\'s overall progression level (0-1000)',
    },
    // Experience points toward next level
    experiencePoints: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Experience points accumulated toward next level',
    },
    // Progress tracking for NASM-based protocol categories
    // Levels for specific areas (all 0-1000)
    coreLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Level in core exercises (0-1000)',
    },
    balanceLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Level in balance exercises (0-1000)',
    },
    stabilityLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Level in stability exercises (0-1000)',
    },
    flexibilityLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Level in flexibility exercises (0-1000)',
    },
    calisthenicsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Level in calisthenics exercises (0-1000)',
    },
    isolationLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Level in isolation exercises (0-1000)',
    },
    stabilizersLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Level in stabilizer exercises (0-1000)',
    },
    injuryPreventionLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Level in injury prevention exercises (0-1000)',
    },
    injuryRecoveryLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
      comment: 'Level in injury recovery exercises (0-1000)',
    },
    
    // Target body part progression levels
    glutesLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    calfsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    shouldersLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    hamstringsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    absLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    chestLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    bicepsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    tricepsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    tibialisAnteriorLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    serratusAnteriorLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    latissimusDorsiLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    hipsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    lowerBackLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    wristsForearmLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    neckLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    
    // Key exercise progression tracking
    squatsLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    lungesLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    planksLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    reversePlanksLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 1000,
      },
    },
    
    // Achievements and badges (JSON storage)
    achievements: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('achievements');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('achievements', JSON.stringify(value));
      },
      comment: 'JSON array of earned achievements and badges',
    },
    
    // Client notes on progress
    progressNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Trainer notes on client progress',
    },
    
    // Level unlock milestones
    unlockedExercises: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('unlockedExercises');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('unlockedExercises', JSON.stringify(value));
      },
      comment: 'JSON array of exercise IDs unlocked by the client',
    },
    
    // Last assessment date
    lastAssessmentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date of last formal assessment',
    },
    
    // Raw data from workout MCP server
    workoutData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Raw JSON data from workout MCP server',
    },
    
    // Raw data from gamification MCP server
    gamificationData: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Raw JSON data from gamification MCP server',
    },
    
    // Last synchronization timestamp
    lastSynced: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last synchronization with MCP servers',
    },
  },
  {
    sequelize,
    modelName: 'ClientProgress',
    tableName: 'client_progress',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId'],
      },
    ],
  }
);

export default ClientProgress;