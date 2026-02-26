'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ── Table 1: long_term_program_plans ────────────────────────────
    await queryInterface.createTable('long_term_program_plans', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      horizonMonths: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('draft', 'approved', 'active', 'archived', 'superseded'),
        allowNull: false,
        defaultValue: 'draft',
      },
      planName: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      goalProfile: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      sourceType: {
        type: Sequelize.ENUM('manual', 'template_only', 'ai_assisted', 'ai_assisted_edited'),
        allowNull: false,
        defaultValue: 'manual',
      },
      aiGenerationRequestId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'ai_interaction_logs',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approvedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      startsOn: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      endsOn: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('long_term_program_plans', ['userId', 'status'], {
      name: 'ltpp_userId_status',
    });

    await queryInterface.addIndex('long_term_program_plans', ['createdByUserId'], {
      name: 'ltpp_createdByUserId',
    });

    // ── Table 2: program_mesocycle_blocks ───────────────────────────
    await queryInterface.createTable('program_mesocycle_blocks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      planId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'long_term_program_plans',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      sequence: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      nasmFramework: {
        type: Sequelize.ENUM('OPT', 'CES', 'GENERAL'),
        allowNull: false,
      },
      optPhase: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      phaseName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      focus: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      durationWeeks: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      sessionsPerWeek: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      entryCriteria: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      exitCriteria: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      constraintsSnapshot: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('program_mesocycle_blocks', ['planId', 'sequence'], {
      unique: true,
      name: 'pmb_planId_sequence_unique',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('program_mesocycle_blocks');
    await queryInterface.dropTable('long_term_program_plans');

    // Drop orphaned ENUM types created by Sequelize on PostgreSQL
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_long_term_program_plans_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_long_term_program_plans_sourceType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_program_mesocycle_blocks_nasmFramework";');
  },
};
