import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const Reward = db.define('Reward', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Gift'
  },
  pointCost: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 500
  },
  tier: {
    type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'),
    allowNull: false,
    defaultValue: 'bronze'
  },
  stock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  redemptionCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rewardType: {
    type: DataTypes.ENUM('session', 'product', 'discount', 'service', 'other'),
    allowNull: false,
    defaultValue: 'other'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

export default Reward;