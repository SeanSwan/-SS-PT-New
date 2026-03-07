'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Equipment Profiles (location inventories)
    await queryInterface.createTable('equipment_profiles', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      locationType: {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'custom',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      equipmentCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      coverPhotoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('equipment_profiles', ['trainerId'], { name: 'idx_equipment_profile_trainer' });
    await queryInterface.addIndex('equipment_profiles', ['trainerId', 'name'], { unique: true, name: 'idx_equipment_profile_trainer_name' });
    await queryInterface.addIndex('equipment_profiles', ['isActive'], { name: 'idx_equipment_profile_active' });
    await queryInterface.addIndex('equipment_profiles', ['locationType'], { name: 'idx_equipment_profile_type' });

    // 2. Equipment Items (individual pieces)
    await queryInterface.createTable('equipment_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      profileId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'equipment_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      trainerLabel: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'other',
      },
      resistanceType: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      photoUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      aiScanData: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      approvalStatus: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'manual',
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 1,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('equipment_items', ['profileId'], { name: 'idx_equipment_item_profile' });
    await queryInterface.addIndex('equipment_items', ['profileId', 'name'], { unique: true, name: 'idx_equipment_item_profile_name' });
    await queryInterface.addIndex('equipment_items', ['category'], { name: 'idx_equipment_item_category' });
    await queryInterface.addIndex('equipment_items', ['approvalStatus'], { name: 'idx_equipment_item_approval' });
    await queryInterface.addIndex('equipment_items', ['isActive'], { name: 'idx_equipment_item_active' });

    // 3. Equipment-Exercise Mapping
    await queryInterface.createTable('equipment_exercise_map', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      equipmentItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'equipment_items', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      exerciseKey: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      exerciseName: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      isCustomExercise: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      customExerciseId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'custom_exercises', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isAiSuggested: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      confirmed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('equipment_exercise_map', ['equipmentItemId'], { name: 'idx_eq_exercise_map_item' });
    await queryInterface.addIndex('equipment_exercise_map', ['exerciseKey'], { name: 'idx_eq_exercise_map_exercise' });
    await queryInterface.addIndex('equipment_exercise_map', ['equipmentItemId', 'exerciseKey'], { unique: true, name: 'idx_eq_exercise_map_unique' });
    await queryInterface.addIndex('equipment_exercise_map', ['customExerciseId'], { name: 'idx_eq_exercise_map_custom' });
    await queryInterface.addIndex('equipment_exercise_map', ['confirmed'], { name: 'idx_eq_exercise_map_confirmed' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('equipment_exercise_map');
    await queryInterface.dropTable('equipment_items');
    await queryInterface.dropTable('equipment_profiles');
  },
};
