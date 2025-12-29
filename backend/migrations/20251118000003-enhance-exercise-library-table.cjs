/**
 * Enhance Exercise Library Table Migration
 * ========================================
 * 
 * Purpose: Ensure exercise_library table has all required NASM fields
 * 
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-BACKEND-IMPLEMENTATION-PLAN.md
 */

exports.up = async function(queryInterface, Sequelize) {
  // Check if table exists
  const tableExists = await queryInterface.tableExists('exercise_library');

  if (!tableExists) {
    // Create new exercise_library table with all fields
    await queryInterface.createTable('exercise_library', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      primary_muscle: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      secondary_muscles: {
        type: Sequelize.ARRAY(Sequelize.STRING(50)),
        allowNull: true
      },
      equipment: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      difficulty: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      movement_patterns: {
        type: Sequelize.ARRAY(Sequelize.STRING(50)),
        allowNull: true
      },
      nasm_phases: {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        allowNull: true
      },
      contraindications: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      acute_variables: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_by: {
        type: Sequelize.UUID,
        references: {
          model: 'Users', // Assuming Users table name is 'Users'
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Indexes
    await queryInterface.addIndex('exercise_library', ['primary_muscle'], { name: 'idx_exercise_library_primary_muscle' });
    await queryInterface.addIndex('exercise_library', ['equipment'], { name: 'idx_exercise_library_equipment' });
    await queryInterface.addIndex('exercise_library', ['difficulty'], { name: 'idx_exercise_library_difficulty' });
    await queryInterface.addIndex('exercise_library', ['nasm_phases'], { name: 'idx_exercise_library_nasm_phases', using: 'GIN' });
    await queryInterface.addIndex('exercise_library', ['movement_patterns'], { name: 'idx_exercise_library_movement_patterns', using: 'GIN' });
  } else {
    // Table exists, check for missing columns and add them
    const tableInfo = await queryInterface.describeTable('exercise_library');
    
    if (!tableInfo.nasm_phases) {
      await queryInterface.addColumn('exercise_library', 'nasm_phases', {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        allowNull: true
      });
      await queryInterface.addIndex('exercise_library', ['nasm_phases'], { name: 'idx_exercise_library_nasm_phases', using: 'GIN' });
    }

    if (!tableInfo.movement_patterns) {
      await queryInterface.addColumn('exercise_library', 'movement_patterns', {
        type: Sequelize.ARRAY(Sequelize.STRING(50)),
        allowNull: true
      });
      await queryInterface.addIndex('exercise_library', ['movement_patterns'], { name: 'idx_exercise_library_movement_patterns', using: 'GIN' });
    }

    if (!tableInfo.contraindications) {
      await queryInterface.addColumn('exercise_library', 'contraindications', {
        type: Sequelize.JSONB,
        allowNull: true
      });
    }

    if (!tableInfo.acute_variables) {
      await queryInterface.addColumn('exercise_library', 'acute_variables', {
        type: Sequelize.JSONB,
        allowNull: true
      });
    }
    
    if (!tableInfo.deletedAt) {
      await queryInterface.addColumn('exercise_library', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  }
};

exports.down = async function(queryInterface, Sequelize) {
  // Only drop if we created it (check for created_by column as a marker)
  const hasCreatedBy = await knex.schema.hasColumn('exercise_library', 'created_by');
  if (hasCreatedBy) {
    // We don't want to drop the table if it existed before, but for this migration logic
    // we assume if we created it fully we can drop it. 
    // However, safer to just remove columns if we added them.
    // For simplicity in this specific task context, we'll leave down migration minimal or empty 
    // to prevent accidental data loss during dev cycles unless explicitly needed.
  }
};