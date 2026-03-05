/**
 * PendingMovementAnalysisMatch Model
 * ===================================
 * Tracks candidate user matches for prospect movement analyses.
 * Mirrors PendingWaiverMatch pattern — admin reviews and approves.
 *
 * Phase 13 — Movement Analysis System
 */
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PendingMovementAnalysisMatch extends Model {}

PendingMovementAnalysisMatch.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    movementAnalysisId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'movement_analyses', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    candidateUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    },
    confidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isInRange(value) {
          if (value !== null && (value < 0 || value > 1)) {
            throw new Error('confidenceScore must be between 0 and 1');
          }
        },
      },
    },
    matchMethod: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending_review', 'auto_linked', 'approved', 'rejected'),
      allowNull: false,
      defaultValue: 'pending_review',
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
  },
  {
    sequelize,
    modelName: 'PendingMovementAnalysisMatch',
    tableName: 'pending_movement_analysis_matches',
    timestamps: true,
    indexes: [
      { fields: ['movementAnalysisId'], name: 'pma_matches_movementAnalysisId' },
      { fields: ['candidateUserId'], name: 'pma_matches_candidateUserId' },
      { fields: ['status'], name: 'pma_matches_status' },
    ],
  },
);

PendingMovementAnalysisMatch.associate = (models) => {
  PendingMovementAnalysisMatch.belongsTo(models.MovementAnalysis, {
    foreignKey: 'movementAnalysisId',
    as: 'movementAnalysis',
  });
  PendingMovementAnalysisMatch.belongsTo(models.User, {
    foreignKey: 'candidateUserId',
    as: 'candidateUser',
  });
  PendingMovementAnalysisMatch.belongsTo(models.User, {
    foreignKey: 'reviewedByUserId',
    as: 'reviewedByUser',
  });
};

export default PendingMovementAnalysisMatch;
