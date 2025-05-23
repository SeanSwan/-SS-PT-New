export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserAchievements', {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    achievementId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Achievements',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    earnedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    progress: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    isCompleted: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    pointsAwarded: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    notificationSent: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
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

  // Add unique constraint on userId and achievementId
  await queryInterface.addIndex('UserAchievements', ['userId', 'achievementId'], {
    unique: true,
    name: 'user_achievement_unique'
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('UserAchievements');
}