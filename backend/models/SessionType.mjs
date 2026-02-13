/**
 * SessionType Model - Universal Master Schedule (Phase 5)
 * =======================================================
 *
 * Purpose:
 * Standardize session duration, buffers, and color metadata to support
 * conflict-aware scheduling and consistent admin configuration.
 *
 * Blueprint Reference:
 * docs/ai-workflow/blueprints/UNIVERSAL-SCHEDULE-PHASE-5-BUFFER-TIMES.md
 *
 * Architecture Overview:
 * +---------------------+       +--------------------+
 * | Universal Schedule  |-----> | SessionType Model  |
 * | (Admin UI + API)    |       +--------------------+
 * +---------------------+               |
 *                                       v
 *                                (session_types)
 *
 * Database ERD (core relationship):
 * +-------------------+     +------------------+
 * | session_types     | 1:N | sessions         |
 * | id (PK)           |-----| sessionTypeId FK |
 * | name              |     | bufferBefore     |
 * | duration          |     | bufferAfter      |
 * | bufferBefore      |     | duration         |
 * | bufferAfter       |     | sessionDate      |
 * +-------------------+     +------------------+
 *
 * WHY session_types?
 * - Enforces consistent durations and buffer rules across bookings.
 * - Reduces scheduling errors and manual data entry variance.
 *
 * WHY paranoid (soft delete)?
 * - Allows historical sessions to retain references to prior types.
 * - Enables safe deactivation without losing audit context.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class SessionType extends Model {}

SessionType.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      comment: 'Duration in minutes'
    },
    bufferBefore: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Buffer before session start (minutes)'
    },
    bufferAfter: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Buffer after session end (minutes)'
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#00FFFF',
      comment: 'Hex color used for schedule display'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Optional price override for this session type'
    },
    creditsRequired: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Number of session credits consumed when booking'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    sequelize,
    modelName: 'SessionType',
    tableName: 'session_types',
    timestamps: true,
    paranoid: true
  }
);

export default SessionType;
