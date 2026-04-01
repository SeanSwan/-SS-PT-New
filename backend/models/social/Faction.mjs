/**
 * ============================================================================
 * FILE: Faction.mjs
 * PURPOSE: RPG Faction model — 3 factions users can pledge allegiance to
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the 3 fixed factions (Vanguard, Syndicate,
 * Sentinels) and tracks per-faction aggregate stats for leaderboards.
 * HOW IT FITS IN THE APP: FactionMembership links Users → Factions.
 * KEY DECISIONS: 3 fixed factions (seeded, not user-created) keeps balance.
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Model Definition
// PURPOSE: Core faction attributes + aggregate stats
// ─────────────────────────────────────────────────────────────

const Faction = db.define('Faction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  slug: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  motto: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'shield',
  },
  totalPoints: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
  },
  memberCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'Factions',
  timestamps: true,
});

export default Faction;
