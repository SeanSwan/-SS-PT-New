/**
 * ============================================================================
 * FILE: Party.mjs
 * PURPOSE: RPG Party/Linkshell model — small groups (3-5) with shared HP bar
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Persistent party groups for collaborative fitness.
 * Members share an HP bar that drains on missed workouts and fills on
 * completed ones. Max 5 members keeps parties intimate and accountable.
 */

import { DataTypes } from 'sequelize';
import db from '../../database.mjs';

// ─────────────────────────────────────────────────────────────
// SECTION: Model Definition
// ─────────────────────────────────────────────────────────────

const Party = db.define('Party', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(60),
    allowNull: false,
  },
  leaderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  maxMembers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5,
  },
  currentHP: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
  },
  maxHP: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  inviteCode: {
    type: DataTypes.STRING(8),
    allowNull: false,
    unique: true,
  },
}, {
  tableName: 'Parties',
  timestamps: true,
});

export default Party;
