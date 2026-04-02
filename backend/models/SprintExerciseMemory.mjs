/**
 * ============================================================================
 * FILE: SprintExerciseMemory.mjs
 * PURPOSE: Junction table tracking every exercise used in a sprint
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 *
 * WHAT THIS FILE DOES: Records each exercise key used in a sprint, linked
 * to the specific class slot and week. Enables cross-sprint freshness by
 * loading previous sprint's memory as an exclusion set.
 *
 * HOW IT FITS IN THE APP: BootcampSprint → SprintExerciseMemory (many)
 * KEY DECISIONS: Junction table instead of JSONB per AI Village security
 * consensus — enables indexed queries and prevents unbounded JSON growth.
 * ============================================================================
 */

import { DataTypes } from 'sequelize';
import sequelize from '../database.mjs';

const SprintExerciseMemory = sequelize.define('SprintExerciseMemory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sprintId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  exerciseKey: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  slotId: {
    type: DataTypes.INTEGER,
  },
  weekNumber: {
    type: DataTypes.INTEGER,
  },
  accumulatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'sprint_exercise_memory',
  timestamps: false,
});

export default SprintExerciseMemory;
