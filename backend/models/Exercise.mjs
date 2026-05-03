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
    
    // Coaching cues for trainers and clients
    coachingCues: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of coaching/form cues for the exercise'
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
    },

    // ─── V2 Fields (CEO Ruling V2.0) ────────────────────────────

    // Immutable unique slug — replaces name-based findOrCreate
    // Format: "nasm-barbell-bench-press", "freedb-3-4-sit-up", "custom-my-exercise"
    exercise_key: {
      type: DataTypes.STRING(255),
      allowNull: true, // Nullable for backward compat until backfill runs
      unique: true,
      comment: 'Immutable unique slug for idempotent upserts',
    },

    // Source tracking for multi-database exercises
    source: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'nasm',
      comment: 'Origin: nasm, free-exercise-db, wrkout, p90x, custom',
    },

    // V3b.3 (2026-05-03) — NASM Corrective Exercise Specialist (CES) tagging.
    // Migration: 20260504000000-add-nasm-corrective-fields.cjs.
    // Authoritative reference: docs/ai-workflow/references/NASM-CES-TAXONOMY.md.
    nasmCorrectiveCategory: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Array of NASM CES compensation tags (e.g. ["upper_crossed_syndrome","forward_head"]). NULL for non-corrective exercises. See NASM-CES-TAXONOMY.md §1 for the canonical tag list.',
    },
    cesProtocolStep: {
      type: DataTypes.STRING(32),
      allowNull: true,
      validate: {
        isIn: {
          args: [['inhibit', 'lengthen', 'activate', 'integrate']],
          msg: 'cesProtocolStep must be one of: inhibit, lengthen, activate, integrate',
        },
      },
      comment: 'NASM CES 4-step protocol position. STRING (not enum) per Codex 2026-05-03 review so future values land without migration.',
    },
    sourceCitation: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Authoritative citation for V3b.3 corrective exercises. Distinct from `source` (which records origin). See NASM-CES-TAXONOMY.md §6 for allowed citation list.',
    },

    // Biomechanical classification
    force: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'push, pull, static, or null for flexibility/cardio',
    },
    mechanic: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'compound, isolation, or null',
    },

    // Search enhancement — alternate names
    aliases: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('aliases');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('aliases', JSON.stringify(value));
      },
      comment: 'JSON array of alternate exercise names for fuzzy search',
    },

    // NASM OPT phase compatibility
    optPhases: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue('optPhases');
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value) {
        this.setDataValue('optPhases', JSON.stringify(value));
      },
      comment: 'JSON array of NASM OPT phase numbers (1-5) this exercise fits',
    },

    // NASM movement pattern classification
    nasmMovementPattern: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'NASM movement: squat, hinge, push, pull, press, rotation, gait',
    },

    // Visual reference for rolodex
    thumbnailUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'URL to exercise GIF or thumbnail image',
    },

    // Default training parameters
    defaultTempo: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Default tempo notation, e.g. "4/2/1"',
    },
    defaultRestSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Default rest period in seconds',
    },

    // Mobile-friendly filter category (maps to 10 filter chips)
    bodyPartCategory: {
      type: DataTypes.STRING(30),
      allowNull: true,
      comment: 'Mobile filter: chest, back, shoulders, arms, legs, core, full_body, recovery, cardio',
    },
  },
  {
    sequelize,
    modelName: 'Exercise',
    tableName: "Exercises",
    timestamps: true
  }
);

export default Exercise;