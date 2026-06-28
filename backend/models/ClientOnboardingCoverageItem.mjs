/**
 * ClientOnboardingCoverageItem model.
 *
 * Non-gating ledger for what the trainer/client onboarding flow already knows,
 * still needs, or should ignore. Coverage status is operational guidance only;
 * workout logging must not depend on all rows being known.
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

export const CLIENT_ONBOARDING_COVERAGE_STATUSES = Object.freeze([
  'known',
  'unknown',
  'trainer_pending',
  'client_requested',
  'not_applicable',
  'blocked',
]);

class ClientOnboardingCoverageItem extends Model {}

ClientOnboardingCoverageItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    coverageKey: {
      type: DataTypes.STRING(120),
      allowNull: false,
      validate: {
        len: [1, 120],
      },
    },
    label: {
      type: DataTypes.STRING(160),
      allowNull: false,
      validate: {
        len: [1, 160],
      },
    },
    category: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: 'general',
      validate: {
        len: [1, 80],
      },
    },
    status: {
      type: DataTypes.ENUM(...CLIENT_ONBOARDING_COVERAGE_STATUSES),
      allowNull: false,
      defaultValue: 'unknown',
    },
    value: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requestedFromClient: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    requestedFromClientAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    blockerReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    lastMarkedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    lastMarkedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'ClientOnboardingCoverageItem',
    tableName: 'client_onboarding_coverage_items',
    timestamps: true,
    indexes: [
      { fields: ['clientId'] },
      { fields: ['status'] },
      { fields: ['category'] },
      { unique: true, fields: ['clientId', 'coverageKey'] },
    ],
  }
);

ClientOnboardingCoverageItem.associate = (models) => {
  ClientOnboardingCoverageItem.belongsTo(models.User, {
    foreignKey: 'clientId',
    as: 'client',
  });
  ClientOnboardingCoverageItem.belongsTo(models.User, {
    foreignKey: 'lastMarkedBy',
    as: 'lastMarkedByUser',
  });
};

export default ClientOnboardingCoverageItem;
