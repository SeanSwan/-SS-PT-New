'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const tableDescription = await queryInterface.describeTable('Users');

      if (!tableDescription.clientSource) {
        console.log('➕ Adding clientSource column to Users table...');

        await queryInterface.addColumn('Users', 'clientSource', {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'swanstudios',
          comment: 'Client origin: swanstudios (package holder), move_fitness (gym client), external (other)'
        });

        console.log('✅ clientSource column added successfully');
      } else {
        console.log('⏭️ clientSource column already exists, skipping...');
      }

      // Add index for filtering/reporting by client source
      try {
        await queryInterface.addIndex('Users', ['clientSource'], {
          name: 'idx_users_client_source',
          unique: false
        });
        console.log('📊 Created index idx_users_client_source');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Index idx_users_client_source already exists');
        } else {
          console.warn('⚠️ Could not create index:', error.message);
        }
      }

    } catch (error) {
      console.error('❌ Error adding clientSource column:', error.message);
      throw error;
    }
  },

  async down(queryInterface) {
    try {
      const tableDescription = await queryInterface.describeTable('Users');

      // Remove index first
      try {
        await queryInterface.removeIndex('Users', 'idx_users_client_source');
        console.log('✅ Removed index idx_users_client_source');
      } catch (error) {
        console.warn('⚠️ Index may not exist:', error.message);
      }

      if (tableDescription.clientSource) {
        console.log('Removing clientSource column from Users table...');
        await queryInterface.removeColumn('Users', 'clientSource');
        console.log('✅ clientSource column removed successfully');
      }

    } catch (error) {
      console.error('❌ Error removing clientSource column:', error.message);
      throw error;
    }
  }
};
