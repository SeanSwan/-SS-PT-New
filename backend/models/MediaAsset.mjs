/**
 * MODEL: MediaAsset
 * =================
 * The canonical record for every piece of media the studio produces or ingests.
 *
 * WHY THIS EXISTS: generated output previously existed ONLY as a provider-hosted
 * URL. Those URLs expire (24-72h is typical), so finished renders evaporated —
 * a machine for producing videos you permanently lose. Badges, coverage media and
 * generated video were each siloed per-panel with no shared asset concept, which
 * is also why the Video Library had nothing durable to show.
 *
 * IDEMPOTENCY: r2Key is UNIQUE (enforced in the migration). Delivery from the home
 * agent is at-least-once by design — a crash after upload but before acknowledgement
 * causes a re-render — and the unique key is what makes that harmless: the second
 * completion cannot create a second row for the same bytes.
 *
 * SOFT DELETE ONLY: the R2 object outlives the row. A hard delete would orphan
 * bytes that keep costing money with nothing left pointing at them.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

export const MEDIA_ASSET_KINDS = Object.freeze(['video', 'image', 'audio']);
export const MEDIA_ASSET_SOURCES = Object.freeze(['generated', 'uploaded', 'agent']);

/**
 * Coverage counts 'approved' and beyond ONLY. A raw generation must never silently
 * mark an exercise as covered — that would let the coverage tracker report progress
 * that no human ever looked at.
 */
export const MEDIA_ASSET_APPROVAL_STATUSES = Object.freeze(['draft', 'approved', 'published']);

class MediaAsset extends Model {
  /** Whether this asset may count toward exercise coverage. */
  get countsTowardCoverage() {
    return this.approvalStatus !== 'draft' && !this.deletedAt;
  }
}

MediaAsset.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },

  // "Users".id is INTEGER — verified against schema-snapshot, not assumed.
  ownerUserId: { type: DataTypes.INTEGER, allowNull: false, field: 'owner_user_id' },
  jobId: { type: DataTypes.UUID, allowNull: true, field: 'job_id' },

  kind: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [[...MEDIA_ASSET_KINDS]] },
  },
  source: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [[...MEDIA_ASSET_SOURCES]] },
  },

  // Deterministic and UNIQUE — see IDEMPOTENCY above.
  // Uniqueness is enforced by a PARTIAL index (WHERE deleted_at IS NULL), not here:
  // a model-level `unique: true` would emit a plain unique index that counts
  // soft-deleted rows and permanently burns the key. See the migration.
  r2Key: { type: DataTypes.STRING(500), allowNull: false, field: 'r2_key' },
  posterR2Key: { type: DataTypes.STRING(500), allowNull: true, field: 'poster_r2_key' },
  mime: { type: DataTypes.STRING(80), allowNull: false },
  width: { type: DataTypes.INTEGER, allowNull: true },
  height: { type: DataTypes.INTEGER, allowNull: true },
  durationMs: { type: DataTypes.INTEGER, allowNull: true },
  sizeBytes: { type: DataTypes.BIGINT, allowNull: true },

  // "Exercises".id and content_projects.id are both UUID — NOT integer. An earlier
  // externally-authored blueprint typed these INTEGER, which is the same class of
  // defect that produced UUID-INTEGER-TYPE-MISMATCH-FIX.cjs in this repo.
  exerciseId: { type: DataTypes.UUID, allowNull: true, field: 'exercise_id' },
  projectId: { type: DataTypes.UUID, allowNull: true, field: 'project_id' },

  approvalStatus: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'draft',
    field: 'approval_status',
    validate: { isIn: [[...MEDIA_ASSET_APPROVAL_STATUSES]] },
  },
  tags: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },

  // The durable per-asset record promised to a licensor: provider, model version, and a
  // FROZEN copy of the licence in force at generation time. Nullable on purpose — an
  // uploaded photo has no provenance, and inventing one would be worse than a null.
  provenance: { type: DataTypes.JSONB, allowNull: true },

  deletedAt: { type: DataTypes.DATE, allowNull: true, field: 'deleted_at' },
}, {
  sequelize,
  modelName: 'MediaAsset',
  tableName: 'media_assets',
  timestamps: true,
  underscored: true,
  paranoid: true,
  deletedAt: 'deletedAt',
});

export default MediaAsset;
