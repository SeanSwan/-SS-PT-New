/**
 * ProgramMesocycleBlock Model
 * ===========================
 * A single mesocycle/phase block within a LongTermProgramPlan.
 * Each block has a NASM framework, OPT phase, duration,
 * entry/exit criteria, and coach notes.
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class ProgramMesocycleBlock extends Model {}

ProgramMesocycleBlock.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    planId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'long_term_program_plans',
        key: 'id',
      },
      comment: 'FK to LongTermProgramPlan',
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Order within the plan (1-based)',
    },
    nasmFramework: {
      type: DataTypes.ENUM('OPT', 'CES', 'GENERAL'),
      allowNull: false,
      comment: 'NASM framework governing this block',
    },
    optPhase: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5,
        optPhaseMatchesFramework(value) {
          if (this.nasmFramework === 'OPT' && (value == null || value === '')) {
            throw new Error('optPhase is required when nasmFramework is OPT');
          }
          if (this.nasmFramework !== 'OPT' && value != null) {
            throw new Error('optPhase must be null when nasmFramework is not OPT');
          }
        },
      },
      comment: 'OPT phase 1-5 (only when nasmFramework = OPT)',
    },
    phaseName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
      comment: 'Human-readable phase name',
    },
    focus: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Training focus for this block',
    },
    durationWeeks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 16,
      },
      comment: 'Block duration in weeks (1-16)',
    },
    sessionsPerWeek: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 7,
      },
      comment: 'Target sessions per week',
    },
    entryCriteria: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'NASM-aligned conditions for entering this block',
    },
    exitCriteria: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Conditions for progressing to next block',
    },
    constraintsSnapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Safety constraints at time of generation',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Coach notes for this block',
    },
  },
  {
    sequelize,
    modelName: 'ProgramMesocycleBlock',
    tableName: 'program_mesocycle_blocks',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['planId', 'sequence'],
        name: 'pmb_planId_sequence_unique',
      },
    ],
  }
);

ProgramMesocycleBlock.associate = (models) => {
  ProgramMesocycleBlock.belongsTo(models.LongTermProgramPlan, {
    foreignKey: 'planId',
    as: 'programPlan',
  });
};

export default ProgramMesocycleBlock;
