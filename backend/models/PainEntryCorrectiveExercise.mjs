/**
 * ============================================================================
 * FILE: PainEntryCorrectiveExercise.mjs
 * PURPOSE: Junction model linking pain entries to NASM corrective exercises
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-25
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
 */

import { DataTypes, Model } from 'sequelize';

class PainEntryCorrectiveExercise extends Model {
  /**
   * Set up associations with ClientPainEntry and Exercise models.
   * Uses constraints: false to prevent sync failures if referenced
   * tables don't exist yet.
   */
  static associate(models) {
    if (models.ClientPainEntry) {
      PainEntryCorrectiveExercise.belongsTo(models.ClientPainEntry, {
        foreignKey: 'painEntryId',
        as: 'painEntry',
        constraints: false,
      });
    }

    if (models.Exercise) {
      PainEntryCorrectiveExercise.belongsTo(models.Exercise, {
        foreignKey: 'exerciseId',
        as: 'exercise',
        constraints: false,
      });
    }
  }
}

export function initPainEntryCorrectiveExercise(sequelize) {
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
        type: DataTypes.INTEGER,
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

  return PainEntryCorrectiveExercise;
}

export default PainEntryCorrectiveExercise;
