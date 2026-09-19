import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

/**
 * SwanSpotlight — a curated editorial card pushed from SwanGuard into SwanStudios.
 *
 * Blueprint: docs/ai-workflow/AI-HANDOFF/social-feed-upgrade-2026-09-16/MEGA-BLUEPRINT.md §4.2
 *
 * Editorial, NOT social: no likes, comments, or share counts exist on this model and none
 * may be added (blueprint ban #2). SwanStudios stays news-free — a Spotlight is a
 * positively-gated, human-curated item, never a headline feed.
 *
 * itemId is the natural key supplied by SwanGuard: idempotency is (itemId, revision), so
 * the same revision re-delivered is a no-op and a higher revision is an upsert.
 */
const SwanSpotlight = db.define('SwanSpotlight', {
  itemId: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    allowNull: false
  },
  revision: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  retracted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  headline: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  dek: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  // Re-hosted in SwanStudios R2 at ingest. Never a hot-link back to SwanGuard
  // (blueprint ban #4); null means "render text-only", never "fail the ingest".
  imageUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sourceName: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  sourceUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  curatorNote: {
    type: DataTypes.STRING(140),
    allowNull: true
  },
  sortWeight: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // sha256 of the positivity-ceremony checklist the curator completed — the audit trail
  // that a human gated this item (blueprint §4.1 `gate.checklistHash`).
  gateHash: {
    type: DataTypes.STRING(64),
    allowNull: true
  }
}, {
  tableName: 'SwanSpotlights',
  timestamps: true,
  indexes: [
    // The rail query: live (not retracted, not expired), priority-ordered.
    { fields: ['retracted', 'expiresAt', 'sortWeight'] }
  ]
});

export default SwanSpotlight;
