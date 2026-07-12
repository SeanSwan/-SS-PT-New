/**
 * PersonalRecord.mjs — persisted lift PRs (launch charter Phase 4a)
 * ===================================================================
 * One row per (user, exerciseName, metric) holding the CURRENT best —
 * detection happens at the workout write path (workoutPrDetectionService);
 * history/progression stays derivable from workout_logs (single source of
 * set-level truth; this table is the fast "current best" index that also
 * anchors idempotent PR awards + the SaveSuccessPanel celebration).
 *
 * metric:
 *   - 'weight' — heaviest successful set (any reps ≥ 1)
 *   - 'est1rm' — best Brzycki estimate (valid 1–15 rep sets only, mirroring
 *     oneRepMaxService + /progress-detailed semantics)
 *
 * FK note (house gotcha): userId references "Users" (PascalCase), never the
 * legacy lowercase users table.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PersonalRecord extends Model {}

PersonalRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
    },
    exerciseName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    metric: {
      type: DataTypes.ENUM('weight', 'est1rm'),
      allowNull: false,
    },
    value: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0 },
    },
    /** The set that produced the record (display context). */
    weight: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    reps: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    formId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    achievedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'PersonalRecord',
    tableName: 'personal_records',
    timestamps: true,
    indexes: [
      // Docs-only mirror — migration 20260712030000 owns the schema. The
      // uniqueness is CASE-INSENSITIVE (lower(exerciseName)) so concurrent
      // mixed-case first-ever saves cannot mint duplicate baseline rows;
      // the raw-name index it replaced allowed exactly that race.
      {
        unique: true,
        fields: ['userId', sequelize.fn('lower', sequelize.col('exerciseName')), 'metric'],
        name: 'personal_records_user_lower_exercise_metric_unique',
      },
    ],
  }
);

export default PersonalRecord;
