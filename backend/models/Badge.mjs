import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index.mjs';

class Badge extends Model {}

Badge.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'URL to the custom badge image/GIF from cloud storage.',
  },
  xpReward: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'achievement',
    comment: 'Badge category: achievement, custom, milestone, etc.',
  },
  rarity: {
    type: DataTypes.STRING,
    defaultValue: 'common',
    comment: 'Rarity tier: common, rare, epic, legendary',
  },
}, {
  sequelize,
  modelName: 'Badge',
  tableName: 'badges',
  timestamps: true,
  indexes: [
    { fields: ['name'] },
  ],
});

export default Badge;