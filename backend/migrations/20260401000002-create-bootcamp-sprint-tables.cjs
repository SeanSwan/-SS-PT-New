'use strict';

/**
 * ============================================================================
 * MIGRATION: Create Bootcamp Sprint Planning Tables
 * PURPOSE: 3-month sprint planner with exercise memory tracking
 * TABLES: bootcamp_sprints, sprint_weeks, sprint_class_slots, sprint_exercise_memory
 * ============================================================================
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── Table 1: bootcamp_sprints ─────────────────────────────────────
    await queryInterface.createTable('bootcamp_sprints', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
        field: 'trainerId',
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      durationWeeks: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 12,
      },
      classesPerWeek: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },
      frequencyPattern: {
        type: Sequelize.JSONB,
        defaultValue: ['monday', 'wednesday', 'friday'],
      },
      focusRotation: {
        type: Sequelize.JSONB,
        defaultValue: ['lower_body', 'upper_body', 'full_body'],
      },
      defaultFormat: {
        type: Sequelize.STRING(30),
        defaultValue: 'stations_4x',
      },
      defaultStyle: {
        type: Sequelize.STRING(30),
        defaultValue: 'standard',
      },
      spaceProfileId: {
        type: Sequelize.INTEGER,
        references: { model: 'bootcamp_space_profiles', key: 'id' },
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.ENUM('draft', 'generating', 'active', 'completed', 'archived'),
        defaultValue: 'draft',
      },
      progressionStrategy: {
        type: Sequelize.ENUM('linear', 'undulating', 'block', 'random'),
        defaultValue: 'linear',
      },
      totalClassesPlanned: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      totalClassesCompleted: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      previousSprintId: {
        type: Sequelize.INTEGER,
        references: { model: 'bootcamp_sprints', key: 'id' },
        onDelete: 'SET NULL',
      },
      notes: {
        type: Sequelize.TEXT,
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {},
      },
      generationVersion: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        comment: 'Optimistic locking version for concurrent generation safety',
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('bootcamp_sprints', ['trainerId'], { name: 'idx_sprint_trainer' });
    await queryInterface.addIndex('bootcamp_sprints', ['status'], { name: 'idx_sprint_status' });
    await queryInterface.addIndex('bootcamp_sprints', ['startDate', 'endDate'], { name: 'idx_sprint_dates' });

    // ── Table 2: sprint_weeks ────────────────────────────────────────
    await queryInterface.createTable('sprint_weeks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sprintId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bootcamp_sprints', key: 'id' },
        onDelete: 'CASCADE',
      },
      weekNumber: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      theme: {
        type: Sequelize.STRING(100),
      },
      isDeloadWeek: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      intensityModifier: {
        type: Sequelize.FLOAT,
        defaultValue: 1.0,
        comment: '0.7 = deload, 1.0 = normal, 1.1 = push week',
      },
      notes: {
        type: Sequelize.TEXT,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sprint_weeks', ['sprintId', 'weekNumber'], {
      name: 'idx_sprint_week_number',
      unique: true,
    });

    // ── Table 3: sprint_class_slots ──────────────────────────────────
    await queryInterface.createTable('sprint_class_slots', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      weekId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'sprint_weeks', key: 'id' },
        onDelete: 'CASCADE',
      },
      sprintId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bootcamp_sprints', key: 'id' },
        onDelete: 'CASCADE',
      },
      templateId: {
        type: Sequelize.INTEGER,
        references: { model: 'bootcamp_templates', key: 'id' },
        onDelete: 'SET NULL',
        comment: 'Linked after class is generated',
      },
      classLogId: {
        type: Sequelize.INTEGER,
        references: { model: 'bootcamp_class_log', key: 'id' },
        onDelete: 'SET NULL',
        comment: 'Linked after class is taught and logged',
      },
      dayOfWeek: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: '0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat',
      },
      scheduledDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      dayType: {
        type: Sequelize.STRING(30),
        defaultValue: 'full_body',
      },
      classFormat: {
        type: Sequelize.STRING(30),
        defaultValue: 'stations_4x',
      },
      classStyle: {
        type: Sequelize.STRING(30),
        defaultValue: 'standard',
      },
      status: {
        type: Sequelize.ENUM('planned', 'generated', 'taught', 'skipped'),
        defaultValue: 'planned',
      },
      wasUsed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Trainer confirms "did you teach this class?"',
      },
      usedDate: {
        type: Sequelize.DATEONLY,
        comment: 'Actual date taught (may differ from scheduledDate)',
      },
      trainerConfirmedAt: {
        type: Sequelize.DATE,
        comment: 'When trainer confirmed usage',
      },
      exerciseKeys: {
        type: Sequelize.JSONB,
        defaultValue: [],
        comment: 'Exercise keys used in this slot for quick reference',
      },
      generatedClassData: {
        type: Sequelize.JSONB,
        comment: 'Full generated class payload (stations, exercises, stretches)',
      },
      notes: {
        type: Sequelize.TEXT,
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sprint_class_slots', ['sprintId'], { name: 'idx_slot_sprint' });
    await queryInterface.addIndex('sprint_class_slots', ['weekId'], { name: 'idx_slot_week' });
    await queryInterface.addIndex('sprint_class_slots', ['scheduledDate'], { name: 'idx_slot_date' });
    await queryInterface.addIndex('sprint_class_slots', ['status'], { name: 'idx_slot_status' });

    // ── Table 4: sprint_exercise_memory ──────────────────────────────
    // Junction table per AI Village security consensus — NOT JSONB
    await queryInterface.createTable('sprint_exercise_memory', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sprintId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bootcamp_sprints', key: 'id' },
        onDelete: 'CASCADE',
      },
      exerciseKey: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      slotId: {
        type: Sequelize.INTEGER,
        references: { model: 'sprint_class_slots', key: 'id' },
        onDelete: 'SET NULL',
        comment: 'Which class slot used this exercise',
      },
      weekNumber: {
        type: Sequelize.INTEGER,
        comment: 'Which week this exercise was used in',
      },
      accumulatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('sprint_exercise_memory', ['sprintId', 'exerciseKey'], {
      name: 'idx_sprint_exercise_unique',
      unique: true,
    });
    await queryInterface.addIndex('sprint_exercise_memory', ['sprintId'], { name: 'idx_mem_sprint' });
    await queryInterface.addIndex('sprint_exercise_memory', ['exerciseKey'], { name: 'idx_mem_exercise' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sprint_exercise_memory');
    await queryInterface.dropTable('sprint_class_slots');
    await queryInterface.dropTable('sprint_weeks');
    await queryInterface.dropTable('bootcamp_sprints');

    // Clean up ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bootcamp_sprints_status"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bootcamp_sprints_progressionStrategy"');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sprint_class_slots_status"');
  },
};
