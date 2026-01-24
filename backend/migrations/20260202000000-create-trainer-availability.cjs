/**
 * FILE: 20260202000000-create-trainer-availability.cjs
 * SYSTEM: Universal Master Schedule - Trainer Availability
 *
 * PURPOSE:
 * Create the trainer_availability table to power weekly availability,
 * one-off overrides (vacation/time off), and availability checks for
 * drag/drop rescheduling and booking validation.
 *
 * ARCHITECTURE:
 * ```mermaid
 * graph TD
 *   A[Availability Routes] --> B[Availability Service]
 *   B --> C[(trainer_availability)]
 *   B --> D[(sessions)]
 *   B --> E[(users)]
 *   F[Conflict Service] --> B
 * ```
 *
 * DATABASE ERD:
 * ```
 * +----------------------+      +-----------------+
 * | trainer_availability |  N:1 | users           |
 * | id (PK)              |----->| id (PK)         |
 * | trainer_id (FK)      |      | role            |
 * | day_of_week          |      +-----------------+
 * | start_time           |
 * | end_time             |
 * | is_recurring         |
 * | effective_from       |
 * | effective_to         |
 * | type                 |
 * | reason               |
 * +----------------------+
 * ```
 *
 * DATA FLOW:
 * 1. Admin/Trainer defines weekly availability blocks
 * 2. Overrides (vacation/time off) are stored as non-recurring rows
 * 3. Conflict checks call availability service to validate slots
 * 4. Day/Week views shade unavailable hours based on availability data
 *
 * ERROR STATES:
 * - Table exists: migration skips creation
 * - Invalid FK: creation fails with constraint error
 *
 * WHY use a separate availability table?
 * - Keeps trainer availability independent from session slots
 * - Supports overrides without mutating recurring schedules
 * - Enables conflict checks without creating placeholder sessions
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('trainer_availability')) {
      console.log('trainer_availability already exists, skipping');
      return;
    }

    await queryInterface.createTable('trainer_availability', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        field: 'trainer_id'
      },
      dayOfWeek: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'day_of_week'
      },
      startTime: {
        type: Sequelize.TIME,
        allowNull: false,
        field: 'start_time'
      },
      endTime: {
        type: Sequelize.TIME,
        allowNull: false,
        field: 'end_time'
      },
      isRecurring: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_recurring'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        field: 'is_active'
      },
      effectiveFrom: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'effective_from'
      },
      effectiveTo: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        field: 'effective_to'
      },
      type: {
        type: Sequelize.ENUM('available', 'blocked', 'vacation'),
        allowNull: false,
        defaultValue: 'available'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    });

    await queryInterface.addIndex('trainer_availability', ['trainer_id'], {
      name: 'idx_trainer_availability_trainer_id'
    });

    await queryInterface.addIndex('trainer_availability', ['day_of_week'], {
      name: 'idx_trainer_availability_day_of_week'
    });

    await queryInterface.addIndex(
      'trainer_availability',
      ['trainer_id', 'day_of_week', 'start_time', 'effective_from', 'is_recurring'],
      {
        name: 'idx_trainer_availability_unique_slot',
        unique: true
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('trainer_availability');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_trainer_availability_type";');
  }
};
