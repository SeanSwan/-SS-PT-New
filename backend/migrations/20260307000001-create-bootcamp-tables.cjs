'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. bootcamp_space_profiles (referenced by templates)
    await queryInterface.createTable('bootcamp_space_profiles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        field: 'trainerId',
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      locationName: { type: Sequelize.STRING(200), field: 'locationName' },
      totalAreaSqft: { type: Sequelize.INTEGER, field: 'totalAreaSqft' },
      maxStations: { type: Sequelize.INTEGER, field: 'maxStations' },
      maxPerStation: { type: Sequelize.INTEGER, defaultValue: 4, field: 'maxPerStation' },
      layoutData: { type: Sequelize.JSONB, field: 'layoutData' },
      mediaUrls: { type: Sequelize.JSONB, field: 'mediaUrls' },
      hasOutdoorAccess: { type: Sequelize.BOOLEAN, defaultValue: false, field: 'hasOutdoorAccess' },
      outdoorDescription: { type: Sequelize.TEXT, field: 'outdoorDescription' },
      notes: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // 2. bootcamp_templates
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_bootcamp_templates_classFormat" AS ENUM('stations_4x', 'stations_3x5', 'stations_2x7', 'full_group', 'custom');
    `).catch(() => {});
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_bootcamp_templates_dayType" AS ENUM('lower_body', 'upper_body', 'cardio', 'full_body', 'custom');
    `).catch(() => {});
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_bootcamp_templates_difficultyBase" AS ENUM('easy', 'medium', 'hard', 'mixed');
    `).catch(() => {});

    await queryInterface.createTable('bootcamp_templates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        field: 'trainerId',
      },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT },
      classFormat: {
        type: '"enum_bootcamp_templates_classFormat"',
        allowNull: false,
        field: 'classFormat',
      },
      targetDurationMin: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 45, field: 'targetDurationMin' },
      demoDurationMin: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5, field: 'demoDurationMin' },
      clearDurationMin: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5, field: 'clearDurationMin' },
      dayType: { type: '"enum_bootcamp_templates_dayType"', field: 'dayType' },
      difficultyBase: {
        type: '"enum_bootcamp_templates_difficultyBase"',
        allowNull: false,
        defaultValue: 'medium',
        field: 'difficultyBase',
      },
      equipmentProfileId: {
        type: Sequelize.INTEGER,
        references: { model: 'equipment_profiles', key: 'id' },
        field: 'equipmentProfileId',
      },
      spaceProfileId: {
        type: Sequelize.INTEGER,
        references: { model: 'bootcamp_space_profiles', key: 'id' },
        field: 'spaceProfileId',
      },
      maxParticipants: { type: Sequelize.INTEGER, defaultValue: 20, field: 'maxParticipants' },
      optimalParticipants: { type: Sequelize.INTEGER, defaultValue: 12, field: 'optimalParticipants' },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true, field: 'isActive' },
      tags: { type: Sequelize.TEXT },
      aiGenerated: { type: Sequelize.BOOLEAN, defaultValue: false, field: 'aiGenerated' },
      lastUsedAt: { type: Sequelize.DATE, field: 'lastUsedAt' },
      timesUsed: { type: Sequelize.INTEGER, defaultValue: 0, field: 'timesUsed' },
      metadata: { type: Sequelize.JSONB },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('bootcamp_templates', ['trainerId'], { name: 'idx_bootcamp_templates_trainer' });
    await queryInterface.addIndex('bootcamp_templates', ['classFormat'], { name: 'idx_bootcamp_templates_format' });
    await queryInterface.addIndex('bootcamp_templates', ['dayType'], { name: 'idx_bootcamp_templates_day' });

    // 3. bootcamp_stations
    await queryInterface.createTable('bootcamp_stations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      templateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bootcamp_templates', key: 'id' },
        onDelete: 'CASCADE',
        field: 'templateId',
      },
      stationNumber: { type: Sequelize.INTEGER, allowNull: false, field: 'stationNumber' },
      stationName: { type: Sequelize.STRING(100), field: 'stationName' },
      equipmentNeeded: { type: Sequelize.TEXT, field: 'equipmentNeeded' },
      setupTimeSec: { type: Sequelize.INTEGER, defaultValue: 0, field: 'setupTimeSec' },
      notes: { type: Sequelize.TEXT },
      sortOrder: { type: Sequelize.INTEGER, allowNull: false, field: 'sortOrder' },
    });

    await queryInterface.addIndex('bootcamp_stations', ['templateId', 'stationNumber'], {
      unique: true,
      name: 'idx_bootcamp_stations_unique',
    });

    // 4. bootcamp_exercises
    await queryInterface.createTable('bootcamp_exercises', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      templateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bootcamp_templates', key: 'id' },
        onDelete: 'CASCADE',
        field: 'templateId',
      },
      stationId: {
        type: Sequelize.INTEGER,
        references: { model: 'bootcamp_stations', key: 'id' },
        onDelete: 'CASCADE',
        field: 'stationId',
      },
      exerciseName: { type: Sequelize.STRING(100), allowNull: false, field: 'exerciseName' },
      durationSec: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 35, field: 'durationSec' },
      restSec: { type: Sequelize.INTEGER, defaultValue: 0, field: 'restSec' },
      sortOrder: { type: Sequelize.INTEGER, allowNull: false, field: 'sortOrder' },
      isCardioFinisher: { type: Sequelize.BOOLEAN, defaultValue: false, field: 'isCardioFinisher' },
      muscleTargets: { type: Sequelize.TEXT, field: 'muscleTargets' },
      easyVariation: { type: Sequelize.STRING(100), field: 'easyVariation' },
      mediumVariation: { type: Sequelize.STRING(100), field: 'mediumVariation' },
      hardVariation: { type: Sequelize.STRING(100), field: 'hardVariation' },
      kneeMod: { type: Sequelize.STRING(100), field: 'kneeMod' },
      shoulderMod: { type: Sequelize.STRING(100), field: 'shoulderMod' },
      ankleMod: { type: Sequelize.STRING(100), field: 'ankleMod' },
      wristMod: { type: Sequelize.STRING(100), field: 'wristMod' },
      backMod: { type: Sequelize.STRING(100), field: 'backMod' },
      equipmentRequired: { type: Sequelize.STRING(100), field: 'equipmentRequired' },
      notes: { type: Sequelize.TEXT },
    });

    await queryInterface.addIndex('bootcamp_exercises', ['templateId'], { name: 'idx_bootcamp_exercises_template' });
    await queryInterface.addIndex('bootcamp_exercises', ['stationId'], { name: 'idx_bootcamp_exercises_station' });

    // 5. bootcamp_overflow_plans
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_bootcamp_overflow_plans_strategy" AS ENUM('lap_rotation', 'split_groups', 'add_stations', 'condense');
    `).catch(() => {});

    await queryInterface.createTable('bootcamp_overflow_plans', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      templateId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bootcamp_templates', key: 'id' },
        onDelete: 'CASCADE',
        field: 'templateId',
      },
      triggerCount: { type: Sequelize.INTEGER, allowNull: false, field: 'triggerCount' },
      strategy: { type: '"enum_bootcamp_overflow_plans_strategy"', allowNull: false },
      lapExercises: { type: Sequelize.JSONB, field: 'lapExercises' },
      lapDurationMin: { type: Sequelize.INTEGER, defaultValue: 4, field: 'lapDurationMin' },
      notes: { type: Sequelize.TEXT },
    });

    // 6. bootcamp_class_log
    await queryInterface.createTable('bootcamp_class_log', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      templateId: {
        type: Sequelize.INTEGER,
        references: { model: 'bootcamp_templates', key: 'id' },
        field: 'templateId',
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        field: 'trainerId',
      },
      classDate: { type: Sequelize.DATEONLY, allowNull: false, field: 'classDate' },
      dayType: { type: Sequelize.STRING(30), field: 'dayType' },
      actualParticipants: { type: Sequelize.INTEGER, field: 'actualParticipants' },
      overflowActivated: { type: Sequelize.BOOLEAN, defaultValue: false, field: 'overflowActivated' },
      exercisesUsed: { type: Sequelize.JSONB, allowNull: false, field: 'exercisesUsed' },
      modificationsMade: { type: Sequelize.JSONB, field: 'modificationsMade' },
      trainerNotes: { type: Sequelize.TEXT, field: 'trainerNotes' },
      classRating: { type: Sequelize.INTEGER, field: 'classRating' },
      energyLevel: { type: Sequelize.STRING(20), field: 'energyLevel' },
      createdAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('bootcamp_class_log', ['classDate'], { name: 'idx_bootcamp_log_date' });
    await queryInterface.addIndex('bootcamp_class_log', ['trainerId'], { name: 'idx_bootcamp_log_trainer' });
    await queryInterface.addIndex('bootcamp_class_log', ['dayType'], { name: 'idx_bootcamp_log_day' });

    // 7. exercise_trends
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_exercise_trends_source" AS ENUM('youtube', 'reddit', 'instagram', 'trainer_input', 'nasm_library');
    `).catch(() => {});
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_exercise_trends_nasmRating" AS ENUM('approved', 'approved_with_caveats', 'not_recommended', 'dangerous');
    `).catch(() => {});
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_exercise_trends_impactLevel" AS ENUM('low', 'medium', 'high', 'plyometric');
    `).catch(() => {});

    await queryInterface.createTable('exercise_trends', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      exerciseName: { type: Sequelize.STRING(100), allowNull: false, field: 'exerciseName' },
      source: { type: '"enum_exercise_trends_source"', allowNull: false },
      sourceUrl: { type: Sequelize.TEXT, field: 'sourceUrl' },
      trendScore: { type: Sequelize.INTEGER, field: 'trendScore' },
      nasmRating: { type: '"enum_exercise_trends_nasmRating"', field: 'nasmRating' },
      impactLevel: { type: '"enum_exercise_trends_impactLevel"', field: 'impactLevel' },
      muscleTargets: { type: Sequelize.TEXT, field: 'muscleTargets' },
      difficulty: { type: Sequelize.STRING(20) },
      description: { type: Sequelize.TEXT },
      aiAnalysis: { type: Sequelize.JSONB, field: 'aiAnalysis' },
      discoveredAt: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW'), field: 'discoveredAt' },
      isApproved: { type: Sequelize.BOOLEAN, defaultValue: false, field: 'isApproved' },
      approvedBy: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        field: 'approvedBy',
      },
    });

    await queryInterface.addIndex('exercise_trends', ['source'], { name: 'idx_exercise_trends_source' });
    await queryInterface.addIndex('exercise_trends', ['nasmRating'], { name: 'idx_exercise_trends_rating' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('exercise_trends');
    await queryInterface.dropTable('bootcamp_class_log');
    await queryInterface.dropTable('bootcamp_overflow_plans');
    await queryInterface.dropTable('bootcamp_exercises');
    await queryInterface.dropTable('bootcamp_stations');
    await queryInterface.dropTable('bootcamp_templates');
    await queryInterface.dropTable('bootcamp_space_profiles');

    const types = [
      'enum_bootcamp_templates_classFormat',
      'enum_bootcamp_templates_dayType',
      'enum_bootcamp_templates_difficultyBase',
      'enum_bootcamp_overflow_plans_strategy',
      'enum_exercise_trends_source',
      'enum_exercise_trends_nasmRating',
      'enum_exercise_trends_impactLevel',
    ];
    for (const t of types) {
      await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${t}";`).catch(() => {});
    }
  },
};
