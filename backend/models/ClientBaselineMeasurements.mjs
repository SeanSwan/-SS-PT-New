import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ClientBaselineMeasurements extends Model {}

ClientBaselineMeasurements.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'sessions',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    recordedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    takenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    restingHeartRate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 20,
        max: 220,
      },
    },
    bloodPressureSystolic: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 50,
        max: 250,
      },
    },
    bloodPressureDiastolic: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 30,
        max: 150,
      },
    },
    benchPressWeight: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    benchPressReps: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    squatWeight: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    squatReps: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    deadliftWeight: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    deadliftReps: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    overheadPressWeight: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    overheadPressReps: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    pullUpsReps: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    pullUpsAssisted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    bodyFatPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      validate: {
        min: 0,
        max: 100,
      },
    },
    plankDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 3600, // 60 minutes max
      },
    },
    flexibilityNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    rangeOfMotion: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    injuryNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    painLevel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 10,
      },
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ========================================
    // NASM PROTOCOL FIELDS (Added 2026-01-15)
    // ========================================
    // Reference: docs/ai-workflow/blueprints/NASM-PROTOCOL-REQUIREMENTS.md

    parqScreening: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'NASM PAR-Q+ 7-question screening + medical clearance tracking',
      // Schema: { q1_heart_condition, q2_chest_pain, q3_balance_dizziness, q4_bone_joint_problem, q5_blood_pressure_meds, q6_medical_reason, q7_aware_of_other, medicalClearanceRequired }
    },

    overheadSquatAssessment: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'NASM OHSA 8 kinetic chain checkpoints (anteriorView, lateralView, asymmetricWeightShift, notes, videoUrl)',
      // Schema: { anteriorView: { feetTurnout, feetFlattening, kneeValgus, kneeVarus }, lateralView: { excessiveForwardLean, lowBackArch, armsFallForward, forwardHead }, asymmetricWeightShift, notes, videoUrl }
      validate: {
        isValidOHSA(value) {
          if (value && value.anteriorView) {
            const validCompensations = ['none', 'minor', 'significant'];
            const anterior = value.anteriorView;
            if (anterior.feetTurnout && !validCompensations.includes(anterior.feetTurnout)) {
              throw new Error('Invalid feetTurnout value. Must be: none, minor, or significant');
            }
            if (anterior.feetFlattening && !validCompensations.includes(anterior.feetFlattening)) {
              throw new Error('Invalid feetFlattening value. Must be: none, minor, or significant');
            }
            if (anterior.kneeValgus && !validCompensations.includes(anterior.kneeValgus)) {
              throw new Error('Invalid kneeValgus value. Must be: none, minor, or significant');
            }
            if (anterior.kneeVarus && !validCompensations.includes(anterior.kneeVarus)) {
              throw new Error('Invalid kneeVarus value. Must be: none, minor, or significant');
            }
          }
          if (value && value.lateralView) {
            const validCompensations = ['none', 'minor', 'significant'];
            const lateral = value.lateralView;
            if (lateral.excessiveForwardLean && !validCompensations.includes(lateral.excessiveForwardLean)) {
              throw new Error('Invalid excessiveForwardLean value. Must be: none, minor, or significant');
            }
            if (lateral.lowBackArch && !validCompensations.includes(lateral.lowBackArch)) {
              throw new Error('Invalid lowBackArch value. Must be: none, minor, or significant');
            }
            if (lateral.armsFallForward && !validCompensations.includes(lateral.armsFallForward)) {
              throw new Error('Invalid armsFallForward value. Must be: none, minor, or significant');
            }
            if (lateral.forwardHead && !validCompensations.includes(lateral.forwardHead)) {
              throw new Error('Invalid forwardHead value. Must be: none, minor, or significant');
            }
          }
        },
      },
    },

    nasmAssessmentScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '0-100 composite score calculated from OHSA compensations',
      validate: {
        min: 0,
        max: 100,
      },
    },

    posturalAssessment: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Static postural observations from 3 views',
      // Schema: { anteriorView: string, lateralView: string, posteriorView: string }
    },

    performanceAssessments: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Optional NASM performance tests (cardio, strength, flexibility)',
      // Schema: { cardio: { test, heartRate, rating }, strength: { pushUps, rating }, flexibility: { sitAndReach, rating } }
    },

    correctiveExerciseStrategy: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: '4-phase NASM corrective strategy (Inhibit, Lengthen, Activate, Integrate)',
      // Schema: { compensationsIdentified: [], inhibit: [], lengthen: [], activate: [], integrate: [] }
    },

    medicalClearanceRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'True if PAR-Q+ indicates need for medical clearance before training',
    },

    medicalClearanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Date client received medical clearance from physician',
    },

    medicalClearanceProvider: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Name of physician who provided medical clearance',
    },
  },
  {
    sequelize,
    modelName: 'ClientBaselineMeasurements',
    tableName: 'client_baseline_measurements',
    timestamps: true,
    indexes: [
      { fields: ['userId'] },
      { fields: ['takenAt'] },
    ],
  }
);

ClientBaselineMeasurements.associate = (models) => {
  ClientBaselineMeasurements.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  ClientBaselineMeasurements.belongsTo(models.User, { foreignKey: 'recordedBy', as: 'recordedByUser' });
  ClientBaselineMeasurements.belongsTo(models.Session, { foreignKey: 'sessionId', as: 'session' });
};

// ========================================
// NASM PROTOCOL HELPER METHODS
// ========================================

/**
 * Calculate NASM Assessment Score (0-100) from OHSA compensations
 *
 * Scoring:
 * - none = 100 points
 * - minor = 70 points
 * - significant = 40 points
 *
 * Final score = average of all 9 checkpoints
 *
 * @param {Object} ohsa - overheadSquatAssessment JSONB object
 * @returns {number} - Score from 0-100
 */
ClientBaselineMeasurements.calculateNASMScore = function(ohsa) {
  if (!ohsa || !ohsa.anteriorView || !ohsa.lateralView) {
    return null;
  }

  const scoreMap = { none: 100, minor: 70, significant: 40 };

  const checkpoints = [
    ohsa.anteriorView.feetTurnout,
    ohsa.anteriorView.feetFlattening,
    ohsa.anteriorView.kneeValgus,
    ohsa.anteriorView.kneeVarus,
    ohsa.lateralView.excessiveForwardLean,
    ohsa.lateralView.lowBackArch,
    ohsa.lateralView.armsFallForward,
    ohsa.lateralView.forwardHead,
    ohsa.asymmetricWeightShift,
  ];

  const scores = checkpoints.map((comp) => scoreMap[comp] || 100);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;

  return Math.round(average);
};

/**
 * Determine OPT Model Phase based on NASM Assessment Score
 *
 * Phase Selection:
 * - <60: Phase 1 (Stabilization Endurance) - Focus on corrective exercise
 * - 60-79: Phase 2 (Strength Endurance) - Progress to integrated exercises
 * - 80+: Phases 3-5 based on client goals
 *
 * @param {number} nasmScore - NASM Assessment Score (0-100)
 * @param {string} primaryGoal - Client's primary goal (from questionnaire)
 * @returns {Object} - { phase, name, focus, duration, repRange, tempo, rest }
 */
ClientBaselineMeasurements.selectOPTPhase = function(nasmScore, primaryGoal = 'general_fitness') {
  if (nasmScore < 60) {
    return {
      phase: 1,
      name: 'Stabilization Endurance',
      focus: 'Corrective exercise, core stability, balance training',
      duration: '4-6 weeks',
      repRange: '12-20 reps',
      tempo: '4-2-1 (slow eccentric)',
      rest: '0-90 seconds',
    };
  } else if (nasmScore < 80) {
    return {
      phase: 2,
      name: 'Strength Endurance',
      focus: 'Stabilization + strength training, integrated exercises',
      duration: '4 weeks',
      repRange: '8-12 reps',
      tempo: '2-0-2 (moderate)',
      rest: '0-60 seconds',
    };
  } else {
    // Score 80+: Select based on goals
    if (primaryGoal === 'muscle_gain' || primaryGoal === 'hypertrophy') {
      return {
        phase: 3,
        name: 'Muscular Development (Hypertrophy)',
        focus: 'Muscle growth, volume training',
        duration: '4 weeks',
        repRange: '6-12 reps',
        tempo: '2-0-2',
        rest: '0-60 seconds',
      };
    } else if (primaryGoal === 'maximal_strength') {
      return {
        phase: 4,
        name: 'Maximal Strength',
        focus: 'Heavy loads, low reps, increased rest',
        duration: '4 weeks',
        repRange: '1-5 reps',
        tempo: 'Explosive (X-X-X)',
        rest: '3-5 minutes',
      };
    } else if (primaryGoal === 'athletic_performance' || primaryGoal === 'power') {
      return {
        phase: 5,
        name: 'Power',
        focus: 'Explosive movements, plyometrics, speed',
        duration: '4 weeks',
        repRange: '1-5 reps (explosive)',
        tempo: 'Explosive (X-X-X)',
        rest: '3-5 minutes',
      };
    } else {
      // Default: Strength Endurance for general fitness
      return {
        phase: 2,
        name: 'Strength Endurance',
        focus: 'Balanced strength and endurance training',
        duration: '4 weeks',
        repRange: '8-12 reps',
        tempo: '2-0-2',
        rest: '0-60 seconds',
      };
    }
  }
};

/**
 * Generate NASM Corrective Exercise Strategy based on compensations
 *
 * 4-Phase Approach:
 * 1. Inhibit (Foam Rolling) - Overactive muscles
 * 2. Lengthen (Static Stretching) - Tight muscles
 * 3. Activate (Isolated Strengthening) - Underactive muscles
 * 4. Integrate (Functional Movement) - Movement pattern correction
 *
 * @param {Object} ohsa - overheadSquatAssessment JSONB object
 * @returns {Object} - { compensationsIdentified, inhibit, lengthen, activate, integrate }
 */
ClientBaselineMeasurements.generateCorrectiveStrategy = function(ohsa) {
  if (!ohsa || !ohsa.anteriorView || !ohsa.lateralView) {
    return null;
  }

  const compensations = [];
  const inhibit = [];
  const lengthen = [];
  const activate = [];
  const integrate = [];

  // Anterior View Compensations
  if (ohsa.anteriorView.feetTurnout !== 'none') {
    compensations.push('feet turnout');
    inhibit.push({ muscle: 'Soleus', exercise: 'Foam roll calf', duration: '30s', sets: 1 });
    inhibit.push({ muscle: 'Lateral gastrocnemius', exercise: 'Foam roll calf (lateral)', duration: '30s', sets: 1 });
    lengthen.push({ muscle: 'Soleus/gastrocnemius', exercise: 'Standing calf stretch', duration: '30s', sets: 1 });
    activate.push({ muscle: 'Medial gastrocnemius', exercise: 'Single-leg calf raise', reps: 15, sets: 2 });
  }

  if (ohsa.anteriorView.kneeValgus !== 'none') {
    compensations.push('knee valgus');
    inhibit.push({ muscle: 'TFL', exercise: 'Foam roll IT band', duration: '30s', sets: 1 });
    inhibit.push({ muscle: 'Adductors', exercise: 'Foam roll inner thigh', duration: '30s', sets: 1 });
    lengthen.push({ muscle: 'Adductors', exercise: 'Supine adductor stretch', duration: '30s', sets: 1 });
    lengthen.push({ muscle: 'TFL/IT band', exercise: 'Standing TFL stretch', duration: '30s', sets: 1 });
    activate.push({ muscle: 'Glute medius', exercise: 'Side-lying hip abduction', reps: 15, sets: 2 });
    activate.push({ muscle: 'Glute maximus', exercise: 'Floor bridge', reps: 15, sets: 2 });
    integrate.push({ exercise: 'Ball wall squats', reps: 12, sets: 2, cue: 'Push knees out, maintain alignment' });
  }

  // Lateral View Compensations
  if (ohsa.lateralView.excessiveForwardLean !== 'none') {
    compensations.push('excessive forward lean');
    inhibit.push({ muscle: 'Soleus', exercise: 'Foam roll calf', duration: '30s', sets: 1 });
    inhibit.push({ muscle: 'Hip flexors', exercise: 'Foam roll hip flexors', duration: '30s', sets: 1 });
    lengthen.push({ muscle: 'Hip flexors', exercise: 'Kneeling hip flexor stretch', duration: '30s', sets: 1 });
    lengthen.push({ muscle: 'Calves', exercise: 'Standing calf stretch', duration: '30s', sets: 1 });
    activate.push({ muscle: 'Glute maximus', exercise: 'Floor bridge', reps: 15, sets: 2 });
    activate.push({ muscle: 'Anterior tibialis', exercise: 'Toe raises', reps: 15, sets: 2 });
  }

  if (ohsa.lateralView.lowBackArch !== 'none') {
    compensations.push('low back arch');
    inhibit.push({ muscle: 'Hip flexors', exercise: 'Foam roll hip flexors', duration: '30s', sets: 1 });
    inhibit.push({ muscle: 'Erector spinae', exercise: 'Foam roll low back', duration: '30s', sets: 1 });
    lengthen.push({ muscle: 'Hip flexors', exercise: 'Kneeling hip flexor stretch', duration: '30s', sets: 1 });
    activate.push({ muscle: 'Core', exercise: 'Floor bridge', reps: 15, sets: 2 });
    activate.push({ muscle: 'Hamstrings', exercise: 'Ball leg curls', reps: 12, sets: 2 });
  }

  if (ohsa.lateralView.armsFallForward !== 'none') {
    compensations.push('arms fall forward');
    inhibit.push({ muscle: 'Latissimus dorsi', exercise: 'Foam roll lats', duration: '30s', sets: 1 });
    inhibit.push({ muscle: 'Pectorals', exercise: 'Foam roll chest', duration: '30s', sets: 1 });
    lengthen.push({ muscle: 'Latissimus dorsi', exercise: 'Ball lat stretch', duration: '30s', sets: 1 });
    lengthen.push({ muscle: 'Pectorals', exercise: 'Doorway pec stretch', duration: '30s', sets: 1 });
    activate.push({ muscle: 'Mid/lower trapezius', exercise: 'Cobra', reps: 15, sets: 2 });
    activate.push({ muscle: 'Rotator cuff', exercise: 'External rotation', reps: 12, sets: 2 });
  }

  if (ohsa.lateralView.forwardHead !== 'none') {
    compensations.push('forward head');
    inhibit.push({ muscle: 'Upper trapezius', exercise: 'Foam roll upper traps', duration: '30s', sets: 1 });
    lengthen.push({ muscle: 'Levator scapulae', exercise: 'Neck flexion stretch', duration: '30s', sets: 1 });
    activate.push({ muscle: 'Deep cervical flexors', exercise: 'Chin tucks', reps: 15, sets: 2 });
  }

  // Always add squat integration at the end
  if (compensations.length > 0) {
    integrate.push({ exercise: 'Step-up to balance', reps: 10, sets: 2, cue: 'Control descent, maintain posture' });
  }

  return {
    compensationsIdentified: compensations,
    inhibit: [...new Map(inhibit.map(item => [item.muscle, item])).values()], // Remove duplicates
    lengthen: [...new Map(lengthen.map(item => [item.muscle, item])).values()],
    activate: [...new Map(activate.map(item => [item.muscle, item])).values()],
    integrate,
  };
};

export default ClientBaselineMeasurements;
