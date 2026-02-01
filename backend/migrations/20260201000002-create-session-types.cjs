/**
 * FILE: 20260201000002-create-session-types.cjs
 * SYSTEM: Universal Master Schedule - Phase 5 Buffer Times
 *
 * PURPOSE:
 * Introduce session_types with bufferBefore/bufferAfter and link sessions
 * to standardized session types for conflict-aware scheduling.
 *
 * BLUEPRINT REFERENCE:
 * docs/ai-workflow/blueprints/UNIVERSAL-SCHEDULE-PHASE-5-BUFFER-TIMES.md
 *
 * ARCHITECTURE OVERVIEW:
 * ```mermaid
 * graph TD
 *   UI[Universal Schedule UI] --> API[Session + SessionType API]
 *   API --> ST[SessionType Model]
 *   API --> S[Session Model]
 *   ST --> DB1[(session_types)]
 *   S --> DB2[(sessions)]
 * ```
 *
 * DATABASE ERD (NEW RELATION):
 * ```
 * +-------------------+     +------------------+
 * | session_types     | 1:N | sessions         |
 * | id (PK)           |-----| sessionTypeId FK |
 * | name              |     | bufferBefore     |
 * | duration          |     | bufferAfter      |
 * | bufferBefore      |     | duration         |
 * | bufferAfter       |     | sessionDate      |
 * +-------------------+     +------------------+
 * ```
 *
 * DATA FLOW:
 * 1) Admin creates Session Type (duration + buffers)
 * 2) Session create uses sessionTypeId to apply buffers
 * 3) Conflict checks use effective start/end times
 *
 * ERROR STATES:
 * - Table already exists: migration skips create
 * - Columns already exist: migration skips addColumn
 * - Seed data already present: migration skips insert
 *
 * WHY SECTIONS:
 * WHY session_types table?
 * - Standardizes session durations + buffer rules
 * - Prevents ad hoc data entry and reduces scheduling errors
 *
 * WHY bufferBefore/bufferAfter on sessions too?
 * - Snapshot buffer values at time of booking
 * - Protects historical integrity if session types change
 *
 * CREATED: 2026-02-01
 * LAST MODIFIED: 2026-02-01
 */

'use strict';

const DEFAULT_SESSION_TYPES = [
  {
    name: 'Personal Training',
    description: null,
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 15,
    color: '#00FFFF',
    price: null,
    isActive: true,
    sortOrder: 1
  },
  {
    name: 'Extended Session',
    description: null,
    duration: 90,
    bufferBefore: 0,
    bufferAfter: 15,
    color: '#00A0E3',
    price: null,
    isActive: true,
    sortOrder: 2
  },
  {
    name: 'Assessment',
    description: null,
    duration: 90,
    bufferBefore: 15,
    bufferAfter: 15,
    color: '#7851A9',
    price: null,
    isActive: true,
    sortOrder: 3
  },
  {
    name: 'Quick Check-in',
    description: null,
    duration: 30,
    bufferBefore: 0,
    bufferAfter: 10,
    color: '#00FF88',
    price: null,
    isActive: true,
    sortOrder: 4
  },
  {
    name: 'Partner Training',
    description: null,
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 15,
    color: '#FF6B6B',
    price: null,
    isActive: true,
    sortOrder: 5
  }
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableNames = await queryInterface.showAllTables();
    const normalizedTables = tableNames.map((name) => name.toString());

    if (!normalizedTables.includes('session_types')) {
      await queryInterface.createTable('session_types', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        duration: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 60
        },
        bufferBefore: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        bufferAfter: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        color: {
          type: Sequelize.STRING(7),
          allowNull: true,
          defaultValue: '#00FFFF'
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        sortOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true
        }
      });
    }

    const sessionTypesIndexes = await queryInterface.showIndex('session_types');
    const sessionTypesIndexNames = sessionTypesIndexes.map((index) => index.name);

    if (!sessionTypesIndexNames.includes('idx_session_types_active')) {
      await queryInterface.addIndex('session_types', ['isActive'], {
        name: 'idx_session_types_active'
      });
    }

    const sessionsTable = await queryInterface.describeTable('sessions');

    if (!sessionsTable.sessionTypeId) {
      await queryInterface.addColumn('sessions', 'sessionTypeId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'session_types',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
    }

    if (!sessionsTable.bufferBefore) {
      await queryInterface.addColumn('sessions', 'bufferBefore', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    if (!sessionsTable.bufferAfter) {
      await queryInterface.addColumn('sessions', 'bufferAfter', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    const sessionIndexes = await queryInterface.showIndex('sessions');
    const sessionIndexNames = sessionIndexes.map((index) => index.name);

    if (!sessionIndexNames.includes('sessions_session_type_id_idx')) {
      await queryInterface.addIndex('sessions', ['sessionTypeId'], {
        name: 'sessions_session_type_id_idx'
      });
    }

    const [countRows] = await queryInterface.sequelize.query(
      'SELECT COUNT(*)::int AS count FROM session_types;'
    );
    const currentCount = Array.isArray(countRows) ? countRows[0]?.count : 0;

    if (currentCount === 0) {
      const now = new Date();
      const seedRows = DEFAULT_SESSION_TYPES.map((row) => ({
        ...row,
        createdAt: now,
        updatedAt: now
      }));
      await queryInterface.bulkInsert('session_types', seedRows);
    }
  },

  down: async (queryInterface) => {
    const tableNames = await queryInterface.showAllTables();
    const normalizedTables = tableNames.map((name) => name.toString());

    if (normalizedTables.includes('sessions')) {
      const sessionsTable = await queryInterface.describeTable('sessions');
      const sessionIndexes = await queryInterface.showIndex('sessions');
      const sessionIndexNames = sessionIndexes.map((index) => index.name);

      if (sessionsTable.sessionTypeId) {
        if (sessionIndexNames.includes('sessions_session_type_id_idx')) {
          await queryInterface.removeIndex('sessions', 'sessions_session_type_id_idx');
        }
        await queryInterface.removeColumn('sessions', 'sessionTypeId');
      }

      if (sessionsTable.bufferBefore) {
        await queryInterface.removeColumn('sessions', 'bufferBefore');
      }

      if (sessionsTable.bufferAfter) {
        await queryInterface.removeColumn('sessions', 'bufferAfter');
      }
    }

    if (normalizedTables.includes('session_types')) {
      const sessionTypesIndexes = await queryInterface.showIndex('session_types');
      const sessionTypesIndexNames = sessionTypesIndexes.map((index) => index.name);

      if (sessionTypesIndexNames.includes('idx_session_types_active')) {
        await queryInterface.removeIndex('session_types', 'idx_session_types_active');
      }

      await queryInterface.dropTable('session_types');
    }
  }
};
