import { DataTypes } from 'sequelize';
import db from '../database.mjs';

const UserMilestone = db.define('UserMilestone', {
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
  milestoneId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Milestones',
      key: 'id'
    }
  },
  reachedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  bonusPointsAwarded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  notificationSent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'milestoneId']
    }
  ]
});

export default UserMilestone;