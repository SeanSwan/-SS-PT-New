export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Milestones', {
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
    targetPoints: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    tier: {
      type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
      allowNull: false,
      defaultValue: 'bronze'
    },
    bonusPoints: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 100
    },
    icon: {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'Star'
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    imageUrl: {
      type: Sequelize.STRING,
      allowNull: true
    },
    requiredForPromotion: {
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
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('Milestones');
}