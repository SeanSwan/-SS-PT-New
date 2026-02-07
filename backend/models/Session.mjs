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

// Define attendance statuses for check-in tracking
const ATTENDANCE_STATUSES = [
  'present',   // Client showed up
  'no_show',   // Client did not show up
  'late'       // Client arrived late
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
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'End date and time of the session'
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60,
    comment: 'Duration in minutes'
  },
  sessionTypeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to standardized session type',
    references: {
      model: 'session_types',
      key: 'id'
    }
  },
  bufferBefore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Buffer before session start (minutes)'
  },
  bufferAfter: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Buffer after session end (minutes)'
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
    comment: 'Whether this session is part of a recurring series'
  },
  recurringPattern: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Pattern for recurring blocked time (days, until date)'
  },
  recurringGroupId: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Links sessions that belong to the same recurring series'
  },
  recurrenceRule: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'RFC 5545 RRule string for recurrence patterns'
  },
  notifyClient: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether to notify the client about changes for this session'
  },
  isBlocked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether this session represents blocked time'
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
  cancellationDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the session was cancelled'
  },
  cancelledBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User who cancelled the session'
  },
  bookingDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the session was booked'
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
  },
  // P0: Admin Booking on behalf of Client
  bookedByAdminId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin user who booked this session on behalf of the client'
  },
  // MindBody-style cancellation charge fields
  cancellationChargeType: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    comment: 'Type of cancellation charge: none, full, partial, late_fee',
    validate: {
      isIn: {
        args: [['none', 'full', 'partial', 'late_fee', null]],
        msg: 'Cancellation charge type must be one of: none, full, partial, late_fee'
      }
    }
  },
  cancellationChargeAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
    comment: 'Amount charged for cancellation (in dollars)'
  },
  sessionCreditRestored: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether session credit was restored to client after cancellation'
  },
  cancellationChargedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
    comment: 'Timestamp when cancellation charge was processed'
  },
  // MindBody Parity: Admin Cancellation Decision Fields
  cancellationDecision: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    comment: 'Admin decision: pending, charged, waived, or null',
    validate: {
      isIn: {
        args: [['pending', 'charged', 'waived', null]],
        msg: 'Cancellation decision must be one of: pending, charged, waived'
      }
    }
  },
  cancellationReviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Admin user ID who made charge/waive decision'
  },
  cancellationReviewedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when admin made charge/waive decision'
  },
  cancellationReviewReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Admin justification for charge/waive decision'
  },
  // Phase D: Check-In / Attendance Tracking Fields
  attendanceStatus: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
    comment: 'Attendance status: present, no_show, late, or null',
    validate: {
      isIn: {
        args: [['present', 'no_show', 'late', null]],
        msg: 'Attendance status must be one of: present, no_show, late'
      }
    }
  },
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when client checked in'
  },
  checkOutTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when client checked out'
  },
  noShowReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for no-show (if applicable)'
  },
  markedPresentBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID of admin/trainer who recorded attendance'
  },
  attendanceRecordedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when attendance was recorded'
  }
}, {
  sequelize,
  modelName: 'Session',
  tableName: 'sessions',
  timestamps: true,
  paranoid: true
});

export default Session;
