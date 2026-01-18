/**
 * FILE: 20260117000002-add-universal-schedule-fields.cjs
 * SYSTEM: Universal Master Schedule System
 *
 * PURPOSE:
 * Add Universal Schedule fields to sessions and users to support recurrence,
 * notification preferences, and blocked time management.
 *
 * ARCHITECTURE:
 * ```mermaid
 * graph TD
 *   A[UniversalSchedule UI] --> B[Session Routes]
 *   B --> C[Session Model]
 *   B --> D[User Model]
 *   C --> E[(sessions)]
 *   D --> F[(Users)]
 * ```
 *
 * DATABASE ERD:
 * ```
 * +----------------------+     +------------------------+
 * | Users                |     | sessions               |
 * | id (PK)              | 1:N | id (PK)                |
 * | ...                  |     | userId (FK)            |
 * | notificationPrefs    |     | trainerId (FK)         |
 * +----------------------+     | recurrenceRule         |
 *                              | recurringGroupId       |
 *                              | notifyClient           |
 *                              | isRecurring            |
 *                              | isBlocked              |
 *                              +------------------------+
 * ```
 *
 * DATA FLOW:
 * 1. Admin/Trainer creates recurring or blocked sessions
 * 2. API persists recurrenceRule + recurringGroupId to sessions
 * 3. Client/Trainer notifications respect notifyClient + preferences
 *
 * ERROR STATES:
 * - Column already exists: migration skips adding column
 * - Database error: migration fails and logs error
 *
 * WHY SECTIONS:
 * WHY add recurrenceRule?
 * - Standardizes recurrence patterns (RFC 5545) for consistent scheduling
 * - Enables future calendar sync with external providers
 *
 * WHY add recurringGroupId?
 * - Allows updates/cancellation of entire series as a single unit
 * - Prevents brittle date-based grouping logic
 *
 * WHY add notifyClient?
 * - Supports "silent booking" and controlled notification flow
 * - Avoids spamming clients during admin corrections
 *
 * WHY add notificationPreferences on Users?
 * - Centralizes channel-level preferences (email/sms/push)
 * - Supports quiet hours without changing each session record
 *
 * CREATED: 2026-01-17
 * LAST MODIFIED: 2026-01-17
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sessionsTable = await queryInterface.describeTable('sessions');
    const usersTable = await queryInterface.describeTable('Users');
    const sessionIndexes = await queryInterface.showIndex('sessions');
    const indexNames = sessionIndexes.map((index) => index.name);

    if (!sessionsTable.recurringGroupId) {
      await queryInterface.addColumn('sessions', 'recurringGroupId', {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Links sessions that belong to the same recurring series'
      });
    }

    if (!sessionsTable.recurrenceRule) {
      await queryInterface.addColumn('sessions', 'recurrenceRule', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'RFC 5545 RRule string for recurrence patterns'
      });
    }

    if (!sessionsTable.notifyClient) {
      await queryInterface.addColumn('sessions', 'notifyClient', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether to notify the client about changes for this session'
      });
    }

    if (!sessionsTable.isBlocked) {
      await queryInterface.addColumn('sessions', 'isBlocked', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this session represents blocked time'
      });
    }

    if (!usersTable.notificationPreferences) {
      await queryInterface.addColumn('Users', 'notificationPreferences', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Per-user notification preferences (email/sms/push/quietHours)'
      });
    }

    if (!indexNames.includes('sessions_recurring_group_id_idx')) {
      await queryInterface.addIndex('sessions', ['recurringGroupId'], {
        name: 'sessions_recurring_group_id_idx'
      });
    }

    if (!indexNames.includes('sessions_is_blocked_idx')) {
      await queryInterface.addIndex('sessions', ['isBlocked'], {
        name: 'sessions_is_blocked_idx'
      });
    }
  },

  down: async (queryInterface) => {
    const sessionsTable = await queryInterface.describeTable('sessions');
    const usersTable = await queryInterface.describeTable('Users');
    const sessionIndexes = await queryInterface.showIndex('sessions');
    const indexNames = sessionIndexes.map((index) => index.name);

    if (sessionsTable.recurringGroupId) {
      if (indexNames.includes('sessions_recurring_group_id_idx')) {
        await queryInterface.removeIndex('sessions', 'sessions_recurring_group_id_idx');
      }
      await queryInterface.removeColumn('sessions', 'recurringGroupId');
    }

    if (sessionsTable.recurrenceRule) {
      await queryInterface.removeColumn('sessions', 'recurrenceRule');
    }

    if (sessionsTable.notifyClient) {
      await queryInterface.removeColumn('sessions', 'notifyClient');
    }

    if (sessionsTable.isBlocked) {
      if (indexNames.includes('sessions_is_blocked_idx')) {
        await queryInterface.removeIndex('sessions', 'sessions_is_blocked_idx');
      }
      await queryInterface.removeColumn('sessions', 'isBlocked');
    }

    if (usersTable.notificationPreferences) {
      await queryInterface.removeColumn('Users', 'notificationPreferences');
    }
  }
};

