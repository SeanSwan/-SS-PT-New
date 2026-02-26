/**
 * LongTermProgramPlan Model
 * =========================
 * Represents a 3/6/12 month NASM-aligned training program.
 * Coach-drafted (AI-assisted or manual) macro-level plan
 * containing mesocycle blocks with progression intent.
 *
 * Phase 5C — Long-Horizon Planning Engine
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class LongTermProgramPlan extends Model {}

LongTermProgramPlan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      comment: 'FK to Users — the client this plan is for',
    },
    horizonMonths: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isIn: [[3, 6, 12]],
      },
      comment: 'Plan duration: 3, 6, or 12 months',
    },
    status: {
      type: DataTypes.ENUM('draft', 'approved', 'active', 'archived', 'superseded'),
      allowNull: false,
      defaultValue: 'draft',
      comment: 'Plan lifecycle state',
    },
    planName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
      comment: 'Coach-visible plan title',
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Plan summary / description',
    },
    goalProfile: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Normalized goal object with primaryGoal, secondaryGoals, constraints',
    },
    sourceType: {
      type: DataTypes.ENUM('manual', 'template_only', 'ai_assisted', 'ai_assisted_edited'),
      allowNull: false,
      defaultValue: 'manual',
      comment: 'How this plan was created',
    },
    aiGenerationRequestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ai_interaction_logs',
        key: 'id',
      },
      comment: 'FK to AiInteractionLog — links to the AI generation audit entry',
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      comment: 'FK to Users — the coach/admin who created the plan (SET NULL on user deletion)',
    },
    approvedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      comment: 'FK to Users — the coach/admin who approved the plan',
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When the plan was approved',
    },
    startsOn: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Planned start date',
    },
    endsOn: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Planned end date',
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Provenance, version info, generation context snapshot',
    },
  },
  {
    sequelize,
    modelName: 'LongTermProgramPlan',
    tableName: 'long_term_program_plans',
    timestamps: true,
    indexes: [
      { fields: ['userId', 'status'], name: 'ltpp_userId_status' },
      { fields: ['createdByUserId'], name: 'ltpp_createdByUserId' },
    ],
  }
);

LongTermProgramPlan.associate = (models) => {
  LongTermProgramPlan.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'client',
  });
  LongTermProgramPlan.belongsTo(models.User, {
    foreignKey: 'createdByUserId',
    as: 'creator',
  });
  LongTermProgramPlan.belongsTo(models.User, {
    foreignKey: 'approvedByUserId',
    as: 'approver',
  });
  LongTermProgramPlan.hasMany(models.ProgramMesocycleBlock, {
    foreignKey: 'planId',
    as: 'mesocycleBlocks',
  });
};

export default LongTermProgramPlan;
