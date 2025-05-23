export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('GamificationSettings', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    isEnabled: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    pointsPerWorkout: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 50
    },
    pointsPerExercise: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    pointsPerStreak: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 20
    },
    pointsPerLevel: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 100
    },
    pointsPerReview: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 15
    },
    pointsPerReferral: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 200
    },
    tierThresholds: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {
        bronze: 0,
        silver: 1000,
        gold: 5000,
        platinum: 20000
      }
    },
    levelRequirements: {
      type: Sequelize.JSON,
      allowNull: true
    },
    pointsMultiplier: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 1.0
    },
    enableLeaderboards: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    enableNotifications: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    autoAwardAchievements: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false
    }
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('GamificationSettings');
}