export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserMilestones', {
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
    milestoneId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Milestones',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    reachedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    bonusPointsAwarded: {
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

  // Add unique constraint on userId and milestoneId
  await queryInterface.addIndex('UserMilestones', ['userId', 'milestoneId'], {
    unique: true,
    name: 'user_milestone_unique'
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('UserMilestones');
}