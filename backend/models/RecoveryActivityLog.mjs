/**
 * RecoveryActivityLog Model
 * =========================
 * One row per completed Restore (off-day recovery) item — client, local day,
 * exercise. Powers ritual persistence (checks survive refresh), per-item XP
 * idempotency (unique key), and trainer visibility of off-day adherence.
 *
 * Deliberately NOT a WorkoutSession: recovery activity must never pollute
 * workout analytics/progress charts (Kimi H7, spec 2026-07-21).
 *
 * NOTE: STRING over ENUM for blockKey (same rationale as ClientPainEntry —
 * avoids PostgreSQL ENUM alter issues).
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class RecoveryActivityLog extends Model {}

RecoveryActivityLog.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  exerciseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Exercises', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  localDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Client-local calendar date the item was completed (Kimi H3 timezone law)',
  },
  blockKey: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'inhibit',
    comment: 'CES ritual block: inhibit | lengthen | activate | cardio',
  },
  xpAwarded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  dataSources: {
    type: DataTypes.STRING(120),
    allowNull: true,
    comment: 'Comma-joined provenance machine tags at completion time (trainer register)',
  },
}, {
  sequelize,
  tableName: 'recovery_activity_logs',
  timestamps: true,
  paranoid: false,
  indexes: [
    { unique: true, fields: ['userId', 'localDate', 'exerciseId'], name: 'uq_recovery_user_day_exercise' },
    { fields: ['userId', 'localDate'], name: 'idx_recovery_user_day' },
  ],
});

export default RecoveryActivityLog;
