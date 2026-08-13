/**
 * ============================================================================
 * FILE: PainEntryCorrectiveExercise.mjs
 * PURPOSE: Junction model linking pain entries to NASM corrective exercises
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 *   Defines the many-to-many relationship between ClientPainEntry and Exercise
 *   through the PainEntryCorrectiveExercises junction table. Each record
 *   represents one corrective exercise assigned to a pain entry in a specific
 *   NASM CES protocol phase.
 *
 * HOW IT FITS IN THE APP:
 *   ClientPainEntry → PainEntryCorrectiveExercise → Exercise
 *   AI postural analysis creates these records. Trainers review/edit them.
 *
 * KEY DECISIONS:
 *   Junction table instead of JSONB array — enables referential integrity,
 *   prevents orphaned exercise IDs (AI Village Phase 2 consensus).
 *   Self-initializes at import time (matching ClientPainEntry pattern)
 *   to ensure rawAttributes are available for association setup.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PainEntryCorrectiveExercise extends Model {}

PainEntryCorrectiveExercise.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    painEntryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    exerciseId: {
      // 2026-08-13 (SWA-157 drift evidence): the live "Exercises".id is UUID —
      // verified read-only against production. INTEGER here made the FK
      // "cannot be implemented" on any fresh build, so this table has never
      // been creatable. Kimi's rule applied: fix models toward the LIVE schema,
      // never toward whatever makes sync happy.
      type: DataTypes.UUID,
      allowNull: false,
    },
    phase: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['inhibit', 'lengthen', 'activate', 'integrate']],
      },
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    aiNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    prescription: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
    },
    source: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ai_analysis',
    },
  },
  {
    sequelize,
    modelName: 'PainEntryCorrectiveExercise',
    tableName: 'PainEntryCorrectiveExercises',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['painEntryId', 'exerciseId', 'phase'],
        name: 'idx_unique_pain_exercise_phase',
      },
    ],
  }
);

export default PainEntryCorrectiveExercise;
