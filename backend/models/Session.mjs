import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class Session extends Model {}

Session.init({
  sessionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Start date and time of the session'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60,
    comment: 'Duration in minutes'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Client who booked the session'
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Trainer assigned to the session'
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Physical location for the session'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes for the session'
  },
  status: {
    type: DataTypes.ENUM('available', 'requested', 'scheduled', 'confirmed', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'available',
    comment: 'Current status of the session'
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for cancellation if applicable'
  },
  cancelledBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User who cancelled the session'
  },
  sessionDeducted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether a session was deducted from client package'
  },
  deductionDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the session was deducted'
  },
  confirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the session is confirmed'
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether reminder notification was sent'
  },
  reminderSentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the reminder was sent'
  },
  feedbackProvided: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether client provided feedback'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Client rating (1-5)'
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Client feedback text'
  }
}, {
  sequelize,
  modelName: 'session',
  tableName: 'sessions',
  timestamps: true
});

export default Session;