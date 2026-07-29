/**
 * ============================================================================
 * FILE: UserAchievement.mjs
 * PURPOSE: Junction model tracking user progress toward achievements
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-07-29 (schema-truth rewrite)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Tracks each user's progress toward each achievement —
 * progress value, completion status, earned date, points awarded, and whether
 * the unlock notification went out. Junction between Users and Achievements.
 *
 * SCHEMA TRUTH (verified against information_schema 2026-07-29, CLAUDE.md rule 58):
 * the real "UserAchievements" table has EXACTLY these columns —
 *   id (integer), userId (integer), achievementId (integer), earnedAt, progress,
 *   isCompleted, pointsAwarded, notificationSent, createdAt, updatedAt.
 *
 * The previous version of this model declared ~45 attributes (maxProgress,
 * progressPercentage, progressHistory, xpAwarded, isNew, shareCount, …) and UUID
 * ids — none of which exist in the table, and both id columns are INTEGERS. The
 * consequences in production were:
 *   - every unscoped SELECT threw `column "maxProgress" does not exist`
 *     (gamificationController worked around it with an explicit attribute list;
 *     most other callers crashed or silently returned empty via catch blocks)
 *   - every create() crashed, because Sequelize inserts declared defaults —
 *     the achievement AWARD path never persisted a single row
 * None of the rich fields ever had a migration; restoring any of them is an
 * additive-migration slice (SWA-87), not a model edit.
 *
 * HOW IT FITS IN THE APP:
 *   Users ←→ UserAchievement ←→ Achievement (associations in associations.mjs)
 *   gamificationController award paths findOne/create with these columns;
 *   profile/progress/social controllers read completion + earnedAt.
 */

import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const UserAchievement = db.define('UserAchievement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },

  achievementId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Achievements',
      key: 'id'
    }
  },

  // The table treats a row as an award record: earnedAt is NOT NULL with no DB
  // default, so the model supplies now() to keep create() paths satisfiable.
  earnedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },

  // Progress is stored as a plain number (double precision). Shipped usage
  // treats it as a 0–100 percentage; completion sets it to 100.
  progress: {
    type: DataTypes.DOUBLE,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },

  isCompleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },

  pointsAwarded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },

  notificationSent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'UserAchievements',
  freezeTableName: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'achievementId']
    },
    {
      fields: ['userId', 'isCompleted']
    },
    {
      fields: ['earnedAt']
    }
  ]
});

// Model associations are defined in associations.mjs

export default UserAchievement;
