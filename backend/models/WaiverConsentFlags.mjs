import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class WaiverConsentFlags extends Model {}

WaiverConsentFlags.init(
  {
    waiverRecordId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      references: {
        model: 'waiver_records',
        key: 'id',
      },
    },
    aiConsentAccepted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    liabilityAccepted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    mediaConsentAccepted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    guardianAcknowledged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'WaiverConsentFlags',
    tableName: 'waiver_consent_flags',
    timestamps: true,
  },
);

WaiverConsentFlags.associate = (models) => {
  WaiverConsentFlags.belongsTo(models.WaiverRecord, {
    foreignKey: 'waiverRecordId',
    as: 'waiverRecord',
  });
};

export default WaiverConsentFlags;
