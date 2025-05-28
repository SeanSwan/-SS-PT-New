'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Checking sessions table for missing trainerId column...');
    
    try {
      // Check if trainerId column exists
      const [results] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'trainerId';
      `);
      
      if (results.length === 0) {
        console.log('Adding missing trainerId column to sessions table...');
        
        await queryInterface.addColumn('sessions', 'trainerId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        });
        
        // Add index for performance
        await queryInterface.addIndex('sessions', ['trainerId']);
        
        // Add column comment
        await queryInterface.sequelize.query(
          `COMMENT ON COLUMN "sessions"."trainerId" IS 'Trainer assigned to the session';`
        );
        
        console.log('✅ trainerId column added successfully to sessions table');
      } else {
        console.log('✅ trainerId column already exists in sessions table');
      }
      
    } catch (error) {
      console.error('Error checking/adding trainerId column:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Removing trainerId column from sessions table...');
    await queryInterface.removeColumn('sessions', 'trainerId');
  }
};
