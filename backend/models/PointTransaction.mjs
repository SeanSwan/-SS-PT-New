import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const PointTransaction = db.define('PointTransaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  balance: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  transactionType: {
    type: DataTypes.ENUM('earn', 'spend', 'adjustment', 'bonus', 'expire'),
    allowNull: false
  },
  source: {
    type: DataTypes.ENUM(
      'workout_completion', 
      'exercise_completion', 
      'streak_bonus', 
      'level_up',
      'achievement_earned', 
      'milestone_reached',
      'reward_redemption',
      'package_purchase',
      'friend_referral',
      'admin_adjustment',
      'trainer_award',
      'challenge_completion'
    ),
    allowNull: false
  },
  sourceId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  },
  awardedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
    },
    {
      fields: ['transactionType']
    },
    {
      fields: ['source']
    },
    {
      fields: ['createdAt']
    }
  ]
});

export default PointTransaction;