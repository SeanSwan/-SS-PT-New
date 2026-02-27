import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class WaiverRecordVersion extends Model {}

WaiverRecordVersion.init(
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
    waiverVersionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'waiver_versions',
        key: 'id',
      },
    },
    accepted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'WaiverRecordVersion',
    tableName: 'waiver_record_versions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['waiverRecordId', 'waiverVersionId'],
        name: 'waiver_record_versions_record_version_unique',
      },
    ],
  },
);

WaiverRecordVersion.associate = (models) => {
  WaiverRecordVersion.belongsTo(models.WaiverRecord, {
    foreignKey: 'waiverRecordId',
    as: 'waiverRecord',
  });
  WaiverRecordVersion.belongsTo(models.WaiverVersion, {
    foreignKey: 'waiverVersionId',
    as: 'waiverVersion',
  });
};

export default WaiverRecordVersion;
