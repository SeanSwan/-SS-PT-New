export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Rewards', {
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
      defaultValue: 'Gift'
    },
    pointCost: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 500
    },
    tier: {
      type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
      allowNull: false,
      defaultValue: 'bronze'
    },
    stock: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 10
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    redemptionCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    imageUrl: {
      type: Sequelize.STRING,
      allowNull: true
    },
    rewardType: {
      type: Sequelize.ENUM('session', 'product', 'discount', 'service', 'other'),
      allowNull: false,
      defaultValue: 'other'
    },
    expiresAt: {
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
  await queryInterface.dropTable('Rewards');
}