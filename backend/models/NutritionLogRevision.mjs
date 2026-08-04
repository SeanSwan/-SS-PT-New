/**
 * ============================================================================
 * FILE: NutritionLogRevision.mjs
 * PURPOSE: Append-only audit trail for daily_macro_logs mutations (S0.5)
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-08-04
 * ============================================================================
 *
 * WHAT THIS FILE DOES: One row per PATCH/DELETE/verify on a macro log entry,
 * capturing the BEFORE-state snapshot plus who acted. Before this table,
 * macro edits were hard updates and deletes with no history — a coach could
 * not prove what a client originally logged, and a verify flip left no trace.
 * HOW IT FITS IN THE APP: written best-effort by nutritionLogRevisionService
 * from the macro PATCH/DELETE routes and the reviewer verify route. Rows are
 * never updated or deleted by application code, and deliberately carry NO FK
 * to daily_macro_logs: the audit record must survive the log's deletion.
 * PRIVACY: snapshot.description and snapshot.items text are re-encrypted with
 * the same contexts as the live table before persisting, so encryption-at-rest
 * parity holds even though the route handlers see decrypted instances.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class NutritionLogRevision extends Model {}

NutritionLogRevision.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  macroLogId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'daily_macro_logs.id at capture time; intentionally NOT a FK so audit survives deletion',
  },
  ownerUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'The client the log belongs to',
  },
  actorUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Who performed the mutation (owner, trainer, or admin)',
  },
  actorRole: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['update', 'delete', 'verify']] },
  },
  snapshot: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Full before-state of the row; description/items text re-encrypted',
  },
}, {
  sequelize,
  modelName: 'NutritionLogRevision',
  tableName: 'nutrition_log_revisions',
  timestamps: true,
  updatedAt: false, // append-only: rows are written once, never touched again
  indexes: [
    { fields: ['macroLogId'] },
    { fields: ['ownerUserId', 'createdAt'] },
  ],
});

export default NutritionLogRevision;
