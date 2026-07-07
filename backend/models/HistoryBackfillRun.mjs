/**
 * HistoryBackfillRun.mjs — audit record for attested history backfills (v3 H.3)
 * ===============================================================================
 * One row per commit run: who attested what, the grounding answers, and the
 * exact created form/session ids — which is what makes UNDO possible and the
 * whole feature auditable. FK targets PascalCase "Users" (house gotcha).
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class HistoryBackfillRun extends Model {}

HistoryBackfillRun.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'id' },
    },
    startDate: { type: DataTypes.DATEONLY, allowNull: true },
    endDate: { type: DataTypes.DATEONLY, allowNull: true },
    /** The trainer's certification that this reflects training that occurred. */
    attestation: { type: DataTypes.TEXT, allowNull: false },
    /** Grounding-interview answers (cadence, dominant exercises, breaks…). */
    grounding: { type: DataTypes.JSONB, allowNull: true },
    /** [{date, formId, sessionId}] — the undo map. */
    created: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    skipped: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    undoneAt: { type: DataTypes.DATE, allowNull: true },
    undoneBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    modelName: 'HistoryBackfillRun',
    tableName: 'history_backfill_runs',
    timestamps: true,
    indexes: [{ fields: ['userId'] }],
  }
);

export default HistoryBackfillRun;
