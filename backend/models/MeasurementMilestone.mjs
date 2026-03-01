import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class MeasurementMilestone extends Model {}

MeasurementMilestone.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  measurementId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'body_measurements',
      key: 'id',
    },
  },
  milestoneType: {
    type: DataTypes.ENUM(
      'weight_loss_5lbs',
      'weight_loss_10lbs',
      'weight_loss_20lbs',
      'weight_loss_50lbs',
      'waist_loss_1inch',
      'waist_loss_2inches',
      'waist_loss_4inches',
      'body_fat_drop_1pct',
      'body_fat_drop_5pct',
      'muscle_gain_5lbs',
      'muscle_gain_10lbs',
      'bmi_normal_range',
      'goal_weight_achieved',
      'custom'
    ),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  celebrationMessage: {
    type: DataTypes.TEXT,
  },
  metricType: {
    type: DataTypes.STRING,
  },
  startValue: {
    type: DataTypes.DECIMAL(6, 2),
  },
  endValue: {
    type: DataTypes.DECIMAL(6, 2),
  },
  changeAmount: {
    type: DataTypes.DECIMAL(6, 2),
  },
  changePercentage: {
    type: DataTypes.DECIMAL(5, 2),
  },
  achievedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  daysSinceStart: {
    type: DataTypes.INTEGER,
  },
  triggersRenewalConversation: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  renewalConversationHeld: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  renewalConversationDate: {
    type: DataTypes.DATE,
  },
  renewalConversationNotes: {
    type: DataTypes.TEXT,
  },
  xpReward: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  badgeAwarded: {
    type: DataTypes.STRING,
  },
  isShared: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  shareableImageUrl: {
    type: DataTypes.STRING,
  },
}, {
  sequelize,
  modelName: 'MeasurementMilestone',
  tableName: 'measurement_milestones',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['measurementId'] },
    { fields: ['milestoneType'] },
    { fields: ['achievedAt'] },
    { fields: ['triggersRenewalConversation'] },
  ],
});

export default MeasurementMilestone;
