/**
 * MovementAnalysis Model
 * ======================
 * NASM + Squat University Guided Movement Analysis.
 * Supports prospect assessments (nullable userId) and links
 * to registered clients via PendingMovementAnalysisMatch.
 *
 * Phase 13 — Movement Analysis System
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class MovementAnalysis extends Model {}

MovementAnalysis.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // ── Identity (nullable userId for prospects) ──────────────────
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    fullName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 200] },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: { isEmail: true },
      set(value) {
        this.setDataValue('email', (typeof value === 'string' && value.trim() === '') ? null : value);
      },
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // ── Status & Metadata ─────────────────────────────────────────
    status: {
      type: DataTypes.ENUM('draft', 'completed', 'linked', 'archived'),
      allowNull: false,
      defaultValue: 'draft',
    },
    source: {
      type: DataTypes.ENUM('orientation', 'admin_dashboard', 'in_session'),
      allowNull: false,
      defaultValue: 'admin_dashboard',
    },
    conductedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    assessmentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // ── Step 2: PAR-Q+ Screening ──────────────────────────────────
    parqScreening: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'PAR-Q+ 7-question screening: {q1_heart_condition..q7_aware_of_other: bool}',
    },
    medicalClearanceRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    medicalClearanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    medicalClearanceProvider: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // ── Step 3: Static Postural Assessment ─────────────────────────
    posturalAssessment: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: '{anteriorView, lateralView, posteriorView: string, commonFindings: string[]}',
    },

    // ── Step 4: NASM Overhead Squat Assessment ─────────────────────
    overheadSquatAssessment: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'OHSA 8 kinetic chain checkpoints (none/minor/significant)',
      validate: {
        isValidOHSA(value) {
          if (!value) return;
          const valid = ['none', 'minor', 'significant'];
          const check = (obj, keys) => {
            if (!obj) return;
            for (const k of keys) {
              if (obj[k] && !valid.includes(obj[k])) {
                throw new Error(`Invalid ${k} value. Must be: none, minor, or significant`);
              }
            }
          };
          check(value.anteriorView, ['feetTurnout', 'feetFlattening', 'kneeValgus', 'kneeVarus']);
          check(value.lateralView, ['excessiveForwardLean', 'lowBackArch', 'armsFallForward', 'forwardHead']);
          if (value.asymmetricWeightShift && !valid.includes(value.asymmetricWeightShift)) {
            throw new Error('Invalid asymmetricWeightShift value');
          }
        },
      },
    },
    nasmAssessmentScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '0-100 composite score from OHSA compensations',
      validate: { min: 0, max: 100 },
    },

    // ── Step 5: Squat University Deep Dive ─────────────────────────
    squatUniversityAssessment: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: '{ankleDorsiflexion, hipMobility, thoracicSpineMobility, deepSquat, singleLegBalance}',
    },

    // ── Step 6: Movement Quality Assessments ───────────────────────
    movementQualityAssessments: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: '{singleLegSquat, pushAssessment, pullAssessment, gaitAnalysis}',
    },

    // ── Step 7: Summary & Corrective Strategy ──────────────────────
    correctiveExerciseStrategy: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: '4-phase NASM corrective: {compensationsIdentified, inhibit, lengthen, activate, integrate}',
    },
    optPhaseRecommendation: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: '{phase, name, focus, duration, repRange, tempo, rest}',
    },
    overallMovementQualityScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0, max: 100 },
    },
    trainerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'MovementAnalysis',
    tableName: 'movement_analyses',
    timestamps: true,
    indexes: [
      { fields: ['userId'], name: 'movement_analyses_userId' },
      { fields: ['email'], name: 'movement_analyses_email' },
      { fields: ['phone'], name: 'movement_analyses_phone' },
      { fields: ['status'], name: 'movement_analyses_status' },
      { fields: ['conductedBy'], name: 'movement_analyses_conductedBy' },
      { fields: ['assessmentDate'], name: 'movement_analyses_assessmentDate' },
    ],
  },
);

MovementAnalysis.associate = (models) => {
  MovementAnalysis.belongsTo(models.User, { foreignKey: 'userId', as: 'client' });
  MovementAnalysis.belongsTo(models.User, { foreignKey: 'conductedBy', as: 'conductor' });
  MovementAnalysis.hasMany(models.PendingMovementAnalysisMatch, {
    foreignKey: 'movementAnalysisId',
    as: 'pendingMatches',
  });
};

// ── NASM Helper Methods (copied from ClientBaselineMeasurements) ──

MovementAnalysis.calculateNASMScore = function (ohsa) {
  if (!ohsa || !ohsa.anteriorView || !ohsa.lateralView) return null;
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
  const scores = checkpoints.map((c) => scoreMap[c] || 100);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
};

MovementAnalysis.selectOPTPhase = function (nasmScore, primaryGoal = 'general_fitness') {
  if (nasmScore < 60) {
    return { phase: 1, name: 'Stabilization Endurance', focus: 'Corrective exercise, core stability, balance training', duration: '4-6 weeks', repRange: '12-20 reps', tempo: '4-2-1 (slow eccentric)', rest: '0-90 seconds' };
  } else if (nasmScore < 80) {
    return { phase: 2, name: 'Strength Endurance', focus: 'Stabilization + strength training, integrated exercises', duration: '4 weeks', repRange: '8-12 reps', tempo: '2-0-2 (moderate)', rest: '0-60 seconds' };
  } else {
    if (primaryGoal === 'muscle_gain' || primaryGoal === 'hypertrophy') {
      return { phase: 3, name: 'Muscular Development (Hypertrophy)', focus: 'Muscle growth, volume training', duration: '4 weeks', repRange: '6-12 reps', tempo: '2-0-2', rest: '0-60 seconds' };
    } else if (primaryGoal === 'maximal_strength') {
      return { phase: 4, name: 'Maximal Strength', focus: 'Heavy loads, low reps, increased rest', duration: '4 weeks', repRange: '1-5 reps', tempo: 'Explosive (X-X-X)', rest: '3-5 minutes' };
    } else if (primaryGoal === 'athletic_performance' || primaryGoal === 'power') {
      return { phase: 5, name: 'Power', focus: 'Explosive movements, plyometrics, speed', duration: '4 weeks', repRange: '1-5 reps (explosive)', tempo: 'Explosive (X-X-X)', rest: '3-5 minutes' };
    }
    return { phase: 2, name: 'Strength Endurance', focus: 'Balanced strength and endurance training', duration: '4 weeks', repRange: '8-12 reps', tempo: '2-0-2', rest: '0-60 seconds' };
  }
};

MovementAnalysis.generateCorrectiveStrategy = function (ohsa) {
  if (!ohsa || !ohsa.anteriorView || !ohsa.lateralView) return null;
  const compensations = [];
  const inhibit = [];
  const lengthen = [];
  const activate = [];
  const integrate = [];

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
  if (compensations.length > 0) {
    integrate.push({ exercise: 'Step-up to balance', reps: 10, sets: 2, cue: 'Control descent, maintain posture' });
  }
  return {
    compensationsIdentified: compensations,
    inhibit: [...new Map(inhibit.map((i) => [i.muscle, i])).values()],
    lengthen: [...new Map(lengthen.map((i) => [i.muscle, i])).values()],
    activate: [...new Map(activate.map((i) => [i.muscle, i])).values()],
    integrate,
  };
};

export default MovementAnalysis;
