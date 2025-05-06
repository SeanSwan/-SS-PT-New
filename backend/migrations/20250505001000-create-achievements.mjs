export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Achievements', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    icon: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Award'
    },
    pointValue: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 100
    },
    requirementType: {
      type: Sequelize.ENUM('session_count', 'exercise_count', 'level_reached', 'specific_exercise', 'streak_days', 'workout_time', 'invite_friend', 'purchase_package', 'complete_assessment'),
      allowNull: false
    },
    requirementValue: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    tier: {
      type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
      allowNull: false,
      defaultValue: 'bronze'
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    exerciseId: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Exercises',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    specificRequirement: {
      type: Sequelize.JSON,
      allowNull: true
    },
    badgeImageUrl: {
      type: Sequelize.STRING,
      allowNull: true
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
  await queryInterface.dropTable('Achievements');
}