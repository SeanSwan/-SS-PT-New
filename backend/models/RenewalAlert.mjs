import { DataTypes, Model } from 'sequelize';

export default (sequelize) => {
  class RenewalAlert extends Model {}

  RenewalAlert.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    sessionsRemaining: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    lastSessionDate: {
      type: DataTypes.DATE,
    },
    daysSinceLastSession: {
      type: DataTypes.INTEGER,
    },
    urgencyScore: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 10,
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'contacted', 'renewed', 'dismissed'),
      defaultValue: 'active',
    },
    contactedAt: {
      type: DataTypes.DATE,
    },
    contactedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    notes: {
      type: DataTypes.TEXT,
    },
    renewedAt: {
      type: DataTypes.DATE,
    },
    dismissedAt: {
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'RenewalAlert',
    tableName: 'renewal_alerts',
    timestamps: true,
  });

  return RenewalAlert;
};