/**
 * RecoveryCompletion.mjs — the recovery "done" log (launch charter 4B.3)
 * ========================================================================
 * One row per (user, exerciseKey, date): a client checked off an SMR/stretch/
 * mobility item on the Recovery Board. This is the datum that makes
 * "days-since-last-recovery" derivable, feeds the 4g recovery-adherence chart
 * dimension, and powers the trainer "skipping recovery" compliance signal.
 *
 * DELIBERATE NON-ADOPTION: the dormant corrective_homework_logs table (0 rows)
 * was REJECTED — its client_id FKs the LEGACY lowercase users table with
 * CASCADE (the data-reset landmine class) and it hard-couples to the unused
 * corrective_protocols system. This table FKs PascalCase "Users" (house
 * gotcha) and keys directly on the ces-* exercise registry.
 *
 * Completions are XP-light (idempotent ledger award), NEVER billable, and
 * NEVER advance the main-plan cursor (charter v3 P4: homework is a separate
 * lane from the goal plan).
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class RecoveryCompletion extends Model {}

RecoveryCompletion.init(
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
    /** ces-* registry key of the completed item. */
    exerciseKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    /** Display snapshot so history survives registry renames. */
    exerciseName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    completedDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    source: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'board',
    },
  },
  {
    sequelize,
    modelName: 'RecoveryCompletion',
    tableName: 'recovery_completions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'exerciseKey', 'completedDate'],
        name: 'recovery_completions_user_exercise_date_unique',
      },
      { fields: ['userId', 'completedDate'] },
    ],
  }
);

export default RecoveryCompletion;
