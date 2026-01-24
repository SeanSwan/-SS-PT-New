/**
 * TrainerAvailability Model - Universal Master Schedule
 * =====================================================
 * Stores recurring availability blocks and one-off overrides for trainers.
 * Used by availabilityService and conflict checks to validate scheduling.
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

class TrainerAvailability extends Model {}

TrainerAvailability.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'trainer_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Trainer user ID'
    },
    dayOfWeek: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'day_of_week',
      validate: {
        min: 0,
        max: 6
      },
      comment: '0=Sunday, 6=Saturday'
    },
    startTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'start_time',
      comment: 'Availability start time'
    },
    endTime: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'end_time',
      comment: 'Availability end time'
    },
    isRecurring: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_recurring',
      comment: 'Weekly recurring availability block'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
      comment: 'Active flag for availability block'
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'effective_from',
      comment: 'Start date for one-off overrides'
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'effective_to',
      comment: 'End date for one-off overrides'
    },
    type: {
      type: DataTypes.ENUM('available', 'blocked', 'vacation'),
      allowNull: false,
      defaultValue: 'available',
      comment: 'Availability type'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional reason for overrides'
    }
  },
  {
    sequelize,
    modelName: 'TrainerAvailability',
    tableName: 'trainer_availability',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    scopes: {
      recurring: {
        where: { isRecurring: true, isActive: true }
      },
      overrides: {
        where: { isRecurring: false }
      },
      forTrainer(trainerId) {
        return { where: { trainerId } };
      }
    }
  }
);

export default TrainerAvailability;
