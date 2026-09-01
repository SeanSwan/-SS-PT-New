import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class WorkoutLog extends Model {}

WorkoutLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'workout_sessions',
        key: 'id'
      }
    },
    exerciseName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    circuitName: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    circuitOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 1 }
    },
    exerciseRole: {
      type: DataTypes.STRING(32),
      allowNull: true,
      validate: { isIn: [['primary', 'drop-movement', 'active-recovery', 'core', 'mobility', 'finisher']] }
    },
    setNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reps: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    weight: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    tempo: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    rest: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        restRange(value) {
          if (value !== null && value < 0) {
            throw new Error('rest must be non-negative');
          }
        },
      }
    },
    rpe: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        rpeRange(value) {
          if (value !== null && (value < 1 || value > 10)) {
            throw new Error('rpe must be between 1 and 10');
          }
        },
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Phase 15.0 (2026-04-15): dedicated exercise-level coaching note.
    // Stamped on EVERY row of an exercise group (same value on each row)
    // so deleting any single row preserves the note on the others. This
    // replaces the Phase 13.2 `Coach: ` encoding into set 1's `notes`
    // string, which silently lost data when set 1 was deleted in edit.
    exerciseNote: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    setType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'working',
      validate: { isIn: [['warmup', 'working', 'dropset', 'superset', 'failure', 'amrap', 'rest_pause']] }
    },
    isometricHoldSeconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0 }
    }
  },
  {
    sequelize,
    modelName: 'WorkoutLog',
    tableName: 'workout_logs',
    timestamps: true,
    indexes: [
      {
        name: 'workout_logs_session_id_idx',
        fields: ['sessionId']
      },
      {
        name: 'workout_logs_session_exercise_set_idx',
        fields: ['sessionId', 'exerciseName', 'setNumber']
      }
    ]
  }
);

export default WorkoutLog;
