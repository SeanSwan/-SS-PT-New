/**
 * PainEntryRevision — append-only audit trail for pain entry changes
 * ==================================================================
 * Pain-Chart Slice 4 (F7, PAIN-CHART-UPGRADE-BLUEPRINT-2026-08-04): a
 * severity edit used to overwrite history — a 9 edited down to a 3 left no
 * trace, which is indefensible for a safety-critical, liability-bearing
 * record. Rows are written by the ClientPainEntry afterUpdate hook (catches
 * EVERY writer: REST, AI command lane, self-service) and are never updated
 * or deleted by application code.
 *
 * The revision timeline is also what makes per-episode severity TRENDS
 * truthful (painTrendService) — entries are updated in place, so without
 * revisions there is no history to trend over.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PainEntryRevision extends Model {}

PainEntryRevision.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  painEntryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'client_pain_entries', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'The pain entry this revision belongs to',
  },
  changedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who made the change (null when the actor was not threaded through)',
  },
  changes: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Field-level diff: { field: { from, to } } for tracked fields only',
  },
}, {
  sequelize,
  modelName: 'PainEntryRevision',
  tableName: 'pain_entry_revisions',
  timestamps: true,
  updatedAt: false, // append-only: rows are never updated
  indexes: [
    { fields: ['painEntryId', 'createdAt'], name: 'idx_pain_revision_entry_time' },
  ],
});

export default PainEntryRevision;
