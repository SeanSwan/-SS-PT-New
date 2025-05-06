export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('PointTransactions', {
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
    points: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    balance: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    transactionType: {
      type: Sequelize.ENUM('earn', 'spend', 'adjustment', 'bonus', 'expire'),
      allowNull: false
    },
    source: {
      type: Sequelize.ENUM(
        'workout_completion', 
        'exercise_completion', 
        'streak_bonus', 
        'level_up',
        'achievement_earned', 
        'milestone_reached',
        'reward_redemption',
        'package_purchase',
        'friend_referral',
        'admin_adjustment',
        'trainer_award',
        'challenge_completion'
      ),
      allowNull: false
    },
    sourceId: {
      type: Sequelize.UUID,
      allowNull: true
    },
    description: {
      type: Sequelize.STRING,
      allowNull: false
    },
    metadata: {
      type: Sequelize.JSON,
      allowNull: true
    },
    awardedBy: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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

  // Add indexes for common queries
  await queryInterface.addIndex('PointTransactions', ['userId']);
  await queryInterface.addIndex('PointTransactions', ['transactionType']);
  await queryInterface.addIndex('PointTransactions', ['source']);
  await queryInterface.addIndex('PointTransactions', ['createdAt']);
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('PointTransactions');
}