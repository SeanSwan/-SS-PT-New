export async function up(queryInterface, Sequelize) {
  // Add the tier ENUM type first
  await queryInterface.sequelize.query(`
    CREATE TYPE "enum_users_tier" AS ENUM ('bronze', 'silver', 'gold', 'platinum');
  `).catch(error => {
    // Ignore error if type already exists
    if (error.message.includes('already exists')) {
      console.log('Type "enum_users_tier" already exists, continuing');
    } else {
      throw error;
    }
  });

  // Add gamification columns to the users table
  const columns = [
    {
      column: 'points',
      attributes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      column: 'level',
      attributes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      }
    },
    {
      column: 'tier',
      attributes: {
        type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
        allowNull: false,
        defaultValue: 'bronze'
      }
    },
    {
      column: 'streakDays',
      attributes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      column: 'lastActivityDate',
      attributes: {
        type: Sequelize.DATE,
        allowNull: true
      }
    },
    {
      column: 'totalWorkouts',
      attributes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      column: 'totalExercises',
      attributes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }
    },
    {
      column: 'exercisesCompleted',
      attributes: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {}
      }
    },
    {
      column: 'badgesPrimary',
      attributes: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Achievements',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    }
  ];

  // Add each column
  for (const { column, attributes } of columns) {
    // Check if column already exists
    const tableInfo = await queryInterface.describeTable('Users');
    if (!tableInfo[column]) {
      await queryInterface.addColumn('Users', column, attributes);
    }
  }
}

export async function down(queryInterface, Sequelize) {
  // Remove gamification columns from the users table
  const columns = [
    'points',
    'level',
    'tier',
    'streakDays',
    'lastActivityDate',
    'totalWorkouts',
    'totalExercises',
    'exercisesCompleted',
    'badgesPrimary'
  ];

  for (const column of columns) {
    await queryInterface.removeColumn('Users', column);
  }

  // Remove the tier ENUM type
  await queryInterface.sequelize.query(`
    DROP TYPE IF EXISTS "enum_users_tier";
  `);
}