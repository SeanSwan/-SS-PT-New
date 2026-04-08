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
  // Phase 2: Assignment targets
  assignedTo: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Assignment type: achievement, tab, milestone, or null (unassigned)',
  },
  assignedTarget: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Target identifier: achievement name, tab key (e.g. "workout", "nutrition"), milestone ID',
  },
  prompt: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI generation prompt (for reference)',
  },
  style: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Art style ID used for generation',
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