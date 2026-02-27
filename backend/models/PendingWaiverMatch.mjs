import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class PendingWaiverMatch extends Model {}

PendingWaiverMatch.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    waiverRecordId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'waiver_records',
        key: 'id',
      },
    },
    candidateUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
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
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'PendingWaiverMatch',
    tableName: 'pending_waiver_matches',
    timestamps: true,
    indexes: [
      { fields: ['waiverRecordId'], name: 'pending_waiver_matches_waiverRecordId' },
      { fields: ['candidateUserId'], name: 'pending_waiver_matches_candidateUserId' },
      { fields: ['status'], name: 'pending_waiver_matches_status' },
    ],
  },
);

PendingWaiverMatch.associate = (models) => {
  PendingWaiverMatch.belongsTo(models.WaiverRecord, {
    foreignKey: 'waiverRecordId',
    as: 'waiverRecord',
  });
  PendingWaiverMatch.belongsTo(models.User, {
    foreignKey: 'candidateUserId',
    as: 'candidateUser',
  });
  PendingWaiverMatch.belongsTo(models.User, {
    foreignKey: 'reviewedByUserId',
    as: 'reviewedByUser',
  });
};

export default PendingWaiverMatch;
