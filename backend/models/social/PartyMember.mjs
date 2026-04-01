/**
 * ============================================================================
 * FILE: PartyMember.mjs
 * PURPOSE: Junction table for Party membership
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

const PartyMember = db.define('PartyMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  partyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Parties', key: 'id' },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'member',
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'PartyMembers',
  timestamps: true,
  indexes: [
    { fields: ['partyId'] },
    { fields: ['userId'] },
    { unique: true, fields: ['partyId', 'userId'] },
  ],
});

export default PartyMember;
