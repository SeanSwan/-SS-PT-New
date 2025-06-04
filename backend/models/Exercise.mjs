// backend/models/Exercise.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * Exercise Model
 * Represents exercises in the NASM-based protocol system
 * Categorized by type, body part, difficulty level, and progression path
 */
class Exercise extends Model {}

Exercise.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // Basic exercise information
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
      comment: 'Step-by-step instructions for performing the exercise'
    },
    // Visual references
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL to demonstration video'
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL to demonstration image'
    },
    
    // NASM protocol categorization
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
    
    // Target body parts - primary and secondary
    // Each can be multiple, stored as JSON arrays
    primaryMuscles: {
      type: DataTypes.TEXT,
      allowNull: false,
      get() {
        const rawValue = this.getDataValue('primaryMuscles');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('primaryMuscles', JSON.stringify(value));
      },
      comment: 'JSON array of primary muscles targeted'
    },
    secondaryMuscles: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('secondaryMuscles');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('secondaryMuscles', JSON.stringify(value));
      },
      comment: 'JSON array of secondary muscles targeted'
    },
    
    // Difficulty and progression
    difficulty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 1000
      },
      comment: 'Difficulty level from 0-1000, corresponding to client progression path'
    },
    progressionPath: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('progressionPath');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('progressionPath', JSON.stringify(value));
      },
      comment: 'JSON array of exercise IDs that form the progression path'
    },
    prerequisites: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('prerequisites');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('prerequisites', JSON.stringify(value));
      },
      comment: 'JSON array of exercise IDs that are prerequisites'
    },
    
    // Equipment and setting requirements
    equipmentNeeded: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('equipmentNeeded');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('equipmentNeeded', JSON.stringify(value));
      },
      comment: 'JSON array of equipment required'
    },
    canBePerformedAtHome: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    
    // Safety information
    contraindicationNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Notes on when this exercise should not be performed'
    },
    safetyTips: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Important safety considerations'
    },
    
    // Performance metrics
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
      comment: 'Recommended duration in seconds (for timed exercises)'
    },
    restInterval: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Recommended rest interval in seconds'
    },
    
    // Scientific validation
    scientificReferences: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'References to scientific studies supporting this exercise'
    },
    
    // Level requirements to unlock
    unlockLevel: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Overall level required to unlock this exercise'
    },
    
    // Functional attributes
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
    
    // Gamification elements
    experiencePointsEarned: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: 'XP earned when completing this exercise'
    },
    
    // Tracking metrics
    targetProgressionRate: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Expected progression rate when performing this exercise regularly'
    }
  },
  {
    sequelize,
    modelName: 'Exercise',
    tableName: "Exercises",
    timestamps: true
  }
);

export default Exercise;