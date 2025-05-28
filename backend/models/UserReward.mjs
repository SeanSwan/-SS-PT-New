import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const UserReward = db.define('UserReward', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  rewardId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Rewards',
      key: 'id'
    }
  },
  redeemedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  pointsCost: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('pending', 'fulfilled', 'cancelled', 'expired'),
    allowNull: false,
    defaultValue: 'pending'
  },
  fulfillmentDetails: {
    type: DataTypes.JSON,
    allowNull: true
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fulfilledBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  fulfilledAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

export default UserReward;