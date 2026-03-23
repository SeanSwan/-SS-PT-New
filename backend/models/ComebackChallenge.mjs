/**
 * ============================================================================
 * FILE: ComebackChallenge.mjs
 * PURPOSE: Sequelize model for re-engagement comeback challenges
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Defines the ComebackChallenge model that tracks
 * re-engagement challenges for users who have been inactive. Based on
 * Loss Aversion + Commitment/Consistency psychology.
 *
 * HOW IT FITS IN THE APP:
 *   gamificationController → ComebackChallenge model → PostgreSQL
 *   Daily cron checks lastActivityDate → creates challenge if inactive
 *
 * PSYCHOLOGY:
 * - Loss Aversion (Kahneman & Tversky): Users who invested effort hate losing progress
 * - Commitment/Consistency (Cialdini): Once accepted, users feel obligated to complete
 * - Endowed Progress: Challenge starts with 0/3, not 0/10 — achievable goal
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const ComebackChallenge = db.define('ComebackChallenge', {
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
  type: {
    type: DataTypes.ENUM('welcome_back', 'fresh_start', 'streak_recovery'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'completed', 'expired'),
    allowNull: false,
    defaultValue: 'pending',
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  targetWorkouts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
  },
  completedWorkouts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  xpMultiplier: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 2.0,
  },
  bonusXP: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  daysMissed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});

export default ComebackChallenge;
