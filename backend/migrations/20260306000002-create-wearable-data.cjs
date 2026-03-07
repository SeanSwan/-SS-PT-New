'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('WearableData', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      deviceType: { type: Sequelize.STRING(30), allowNull: false },
      deviceId: { type: Sequelize.STRING(100), allowNull: true },
      recordDate: { type: Sequelize.DATEONLY, allowNull: false },

      // Activity
      steps: { type: Sequelize.INTEGER, allowNull: true },
      distanceMeters: { type: Sequelize.FLOAT, allowNull: true },
      floorsClimbed: { type: Sequelize.INTEGER, allowNull: true },
      activeMinutes: { type: Sequelize.INTEGER, allowNull: true },
      caloriesBurned: { type: Sequelize.INTEGER, allowNull: true },
      activeCalories: { type: Sequelize.INTEGER, allowNull: true },

      // Heart Rate
      restingHeartRate: { type: Sequelize.INTEGER, allowNull: true },
      avgHeartRate: { type: Sequelize.INTEGER, allowNull: true },
      maxHeartRate: { type: Sequelize.INTEGER, allowNull: true },
      heartRateVariability: { type: Sequelize.FLOAT, allowNull: true },
      heartRateZones: { type: Sequelize.JSONB, allowNull: true },

      // Sleep
      sleepDurationMinutes: { type: Sequelize.INTEGER, allowNull: true },
      sleepScore: { type: Sequelize.INTEGER, allowNull: true },
      sleepStages: { type: Sequelize.JSONB, allowNull: true },
      sleepStartTime: { type: Sequelize.DATE, allowNull: true },
      sleepEndTime: { type: Sequelize.DATE, allowNull: true },

      // Workout Sessions
      workoutSessions: { type: Sequelize.JSONB, allowNull: true },

      // Swimming
      swimLaps: { type: Sequelize.INTEGER, allowNull: true },
      swimDistanceMeters: { type: Sequelize.FLOAT, allowNull: true },
      swimDurationMinutes: { type: Sequelize.INTEGER, allowNull: true },
      swimStrokes: { type: Sequelize.INTEGER, allowNull: true },
      swimPacePer100m: { type: Sequelize.FLOAT, allowNull: true },
      swimStrokeType: { type: Sequelize.STRING(30), allowNull: true },
      swimSWOLF: { type: Sequelize.FLOAT, allowNull: true },
      poolLengthMeters: { type: Sequelize.FLOAT, allowNull: true },

      // Cycling
      cyclingDistanceMeters: { type: Sequelize.FLOAT, allowNull: true },
      cyclingDurationMinutes: { type: Sequelize.INTEGER, allowNull: true },
      cyclingAvgSpeedKmh: { type: Sequelize.FLOAT, allowNull: true },
      cyclingMaxSpeedKmh: { type: Sequelize.FLOAT, allowNull: true },
      cyclingAvgPowerWatts: { type: Sequelize.FLOAT, allowNull: true },
      cyclingMaxPowerWatts: { type: Sequelize.FLOAT, allowNull: true },
      cyclingAvgCadence: { type: Sequelize.INTEGER, allowNull: true },
      cyclingElevationGainMeters: { type: Sequelize.FLOAT, allowNull: true },
      cyclingNormalizedPower: { type: Sequelize.FLOAT, allowNull: true },

      // Running
      runDistanceMeters: { type: Sequelize.FLOAT, allowNull: true },
      runDurationMinutes: { type: Sequelize.INTEGER, allowNull: true },
      runAvgPaceMinPerKm: { type: Sequelize.FLOAT, allowNull: true },
      runAvgCadence: { type: Sequelize.INTEGER, allowNull: true },
      runElevationGainMeters: { type: Sequelize.FLOAT, allowNull: true },
      runGroundContactTime: { type: Sequelize.FLOAT, allowNull: true },
      runVerticalOscillation: { type: Sequelize.FLOAT, allowNull: true },
      runTrainingEffect: { type: Sequelize.FLOAT, allowNull: true },

      // Body Composition
      weight: { type: Sequelize.FLOAT, allowNull: true },
      bodyFatPercentage: { type: Sequelize.FLOAT, allowNull: true },

      // Advanced
      vo2Max: { type: Sequelize.FLOAT, allowNull: true },
      respiratoryRate: { type: Sequelize.FLOAT, allowNull: true },
      spo2: { type: Sequelize.FLOAT, allowNull: true },
      stressLevel: { type: Sequelize.INTEGER, allowNull: true },
      bodyBatteryOrRecovery: { type: Sequelize.INTEGER, allowNull: true },

      // Raw & Meta
      rawPayload: { type: Sequelize.JSONB, allowNull: true },
      syncedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      dataQuality: { type: Sequelize.FLOAT, allowNull: true, defaultValue: 1.0 },

      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    // Indexes
    await queryInterface.addIndex('WearableData', ['userId', 'recordDate']);
    await queryInterface.addIndex('WearableData', ['userId', 'deviceType', 'recordDate'], {
      unique: true,
      name: 'wearable_user_device_date_unique',
    });
    await queryInterface.addIndex('WearableData', ['userId', 'createdAt']);
    await queryInterface.addIndex('WearableData', ['deviceType']);
    await queryInterface.addIndex('WearableData', ['recordDate']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('WearableData');
  },
};
