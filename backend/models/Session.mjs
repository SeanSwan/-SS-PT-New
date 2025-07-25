// backend/models/Session.mjs
import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class Session extends Model {}

// Define session statuses as a separate constant
const SESSION_STATUSES = [
  'available',
  'assigned',
  'requested',
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'blocked'
];

Session.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
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
    // Updated to INTEGER to match User.id primary key
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Client who booked the session'
  },
  trainerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
  reason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reason for blocked time'
  },
  isRecurring: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this is a recurring blocked time'
  },
  recurringPattern: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Pattern for recurring blocked time (days, until date)'
  },
  // Use STRING instead of ENUM to avoid SQL generation issues
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'available',
    comment: 'Current status of the session',
    validate: {
      isIn: {
        args: [SESSION_STATUSES],
        msg: `Status must be one of: ${SESSION_STATUSES.join(', ')}`
      }
    }
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for cancellation if applicable'
  },
  cancelledBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
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
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the trainer was assigned to this session'
  },
  assignedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin user who assigned the trainer to this session'
  }
}, {
  sequelize,
  modelName: 'Session',
  tableName: 'sessions',
  timestamps: true,
  paranoid: true
});

export default Session;