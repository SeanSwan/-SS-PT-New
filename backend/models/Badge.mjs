import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

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
    allowNull: true,
    comment: 'URL to the custom badge image/GIF from cloud storage.',
  },
  category: {
    type: DataTypes.ENUM('strength', 'cardio', 'skill', 'flexibility', 'endurance', 'general'),
    allowNull: false,
    defaultValue: 'general',
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
    allowNull: false,
    defaultValue: 'beginner',
  },
  criteriaType: {
    type: DataTypes.ENUM(
      'exercise_completion',
      'streak_achievement',
      'challenge_completion',
      'social_engagement',
      'milestone_reached',
      'custom_criteria'
    ),
    allowNull: false,
  },
  criteria: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  rewards: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: { points: 100 },
  },
  collectionId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'Badge',
  tableName: 'Badges',
  timestamps: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['collectionId'] },
    { fields: ['isActive'] },
    { fields: ['createdAt'] },
    { fields: ['criteriaType'] },
  ],
});

export default Badge;
