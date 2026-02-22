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
        min: 0
      }
    },
    rpe: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 10
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
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
