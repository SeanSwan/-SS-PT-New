export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserRewards', {
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
    rewardId: {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'Rewards',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    redeemedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    pointsCost: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: Sequelize.ENUM('pending', 'fulfilled', 'cancelled', 'expired'),
      allowNull: false,
      defaultValue: 'pending'
    },
    fulfillmentDetails: {
      type: Sequelize.JSON,
      allowNull: true
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    fulfilledBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    fulfilledAt: {
      type: Sequelize.DATE,
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
  await queryInterface.dropTable('UserRewards');
}