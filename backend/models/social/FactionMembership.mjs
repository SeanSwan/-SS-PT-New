/**
 * ============================================================================
 * FILE: FactionMembership.mjs
 * PURPOSE: Tracks user membership in a faction with contribution stats
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Junction table between Users and Factions.
 * One membership per user (unique constraint on userId).
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Model Definition
// ─────────────────────────────────────────────────────────────

const FactionMembership = db.define('FactionMembership', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'Users', key: 'id' },
  },
  factionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Factions', key: 'id' },
  },
  contributionPoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  rank: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'recruit',
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'FactionMemberships',
  timestamps: true,
  indexes: [
    { fields: ['factionId'] },
    { fields: ['contributionPoints'] },
  ],
});

export default FactionMembership;
