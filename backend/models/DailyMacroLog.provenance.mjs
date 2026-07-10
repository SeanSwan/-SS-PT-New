import { DataTypes } from 'sequelize';

/**
 * Additive Nutrition Decision Logger fields for DailyMacroLog.
 * Legacy rows keep these nullable and render as pre-provenance records.
 */
const nutritionProvenanceAttributes = {
  sourceRecordId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'nutrition_source_records', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  loggedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  contractVersion: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  draftId: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  workoutProximity: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      isIn: [['none', 'pre_workout', 'intra_workout', 'post_workout']],
    },
  },
  servingBasis: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      isIn: [['label', 'per_100g', 'weighed', 'household', 'estimated']],
    },
  },
  servingQuantity: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  servingUnit: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  caloriesReported: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  caloriesCalculated: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  reconciliationStatus: {
    type: DataTypes.STRING(30),
    allowNull: true,
    validate: {
      isIn: [['not_applicable', 'calculated_only', 'within_tolerance', 'metabolic_deviation']],
    },
  },
  confidenceScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
    validate: { min: 0, max: 1 },
  },
  reviewStatus: {
    type: DataTypes.STRING(30),
    allowNull: true,
    validate: {
      isIn: [['client_confirmed', 'needs_review', 'verified']],
    },
  },
  reviewReason: {
    type: DataTypes.STRING(80),
    allowNull: true,
  },
  reviewedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  reviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
};

export default nutritionProvenanceAttributes;
