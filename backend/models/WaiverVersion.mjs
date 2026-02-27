import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class WaiverVersion extends Model {}

WaiverVersion.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    waiverType: {
      type: DataTypes.ENUM('core', 'activity_addendum', 'ai_notice'),
      allowNull: false,
    },
    activityType: {
      type: DataTypes.ENUM('HOME_GYM_PT', 'PARK_TRAINING', 'SWIMMING_LESSONS'),
      allowNull: true,
      validate: {
        activityTypeMatchesWaiverType(value) {
          if ((this.waiverType === 'core' || this.waiverType === 'ai_notice') && value != null) {
            throw new Error('activityType must be null for core and ai_notice waiver types');
          }
          if (this.waiverType === 'activity_addendum' && value == null) {
            throw new Error('activityType is required for activity_addendum waiver type');
          }
        },
      },
    },
    version: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 30],
      },
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200],
      },
    },
    htmlText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    markdownText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    textHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      validate: {
        len: [64, 64],
      },
    },
    effectiveAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    retiredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    requiresReconsent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'WaiverVersion',
    tableName: 'waiver_versions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['waiverType', 'activityType', 'version'],
        name: 'waiver_versions_type_activity_version_unique',
      },
    ],
  },
);

WaiverVersion.associate = (models) => {
  WaiverVersion.belongsTo(models.User, {
    foreignKey: 'createdByUserId',
    as: 'creator',
  });
  WaiverVersion.hasMany(models.WaiverRecordVersion, {
    foreignKey: 'waiverVersionId',
    as: 'recordLinks',
  });
};

export default WaiverVersion;
