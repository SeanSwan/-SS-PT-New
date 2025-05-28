import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const Milestone = db.define('Milestone', {
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
  targetPoints: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tier: {
    type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'),
    allowNull: false,
    defaultValue: 'bronze'
  },
  bonusPoints: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Star'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  requiredForPromotion: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  timestamps: true
});

export default Milestone;