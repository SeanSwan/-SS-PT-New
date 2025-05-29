'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding missing columns to sessions table...');
    
    try {
      // Check if columns already exist before adding them
      const tableDescription = await queryInterface.describeTable('sessions');
      
      // Add reason column if it doesn't exist
      if (!tableDescription.reason) {
        await queryInterface.addColumn('sessions', 'reason', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Reason for blocked time'
        });
        console.log('✅ Added reason column');
      }

      // Add isRecurring column if it doesn't exist
      if (!tableDescription.isRecurring) {
        await queryInterface.addColumn('sessions', 'isRecurring', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether this is a recurring blocked time'
        });
        console.log('✅ Added isRecurring column');
      }

      // Add recurringPattern column if it doesn't exist
      if (!tableDescription.recurringPattern) {
        await queryInterface.addColumn('sessions', 'recurringPattern', {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'Pattern for recurring blocked time (days, until date)'
        });
        console.log('✅ Added recurringPattern column');
      }

      // Add deletedAt column for paranoid mode if it doesn't exist
      if (!tableDescription.deletedAt) {
        await queryInterface.addColumn('sessions', 'deletedAt', {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Soft delete timestamp for paranoid mode'
        });
        console.log('✅ Added deletedAt column');
      }

      // Add index on deletedAt for paranoid queries
      try {
        await queryInterface.addIndex('sessions', ['deletedAt'], {
          name: 'sessions_deleted_at_idx'
        });
        console.log('✅ Added deletedAt index');
      } catch (indexError) {
        // Index might already exist, continue
        console.log('ℹ️ Index may already exist, continuing...');
      }

      // Add comments to existing columns if needed
      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN "sessions"."reason" IS 'Reason for blocked time';`
      ).catch(() => {
        // Comment might already exist, ignore error
      });

      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN "sessions"."isRecurring" IS 'Whether this is a recurring blocked time';`
      ).catch(() => {
        // Comment might already exist, ignore error
      });

      await queryInterface.sequelize.query(
        `COMMENT ON COLUMN "sessions"."recurringPattern" IS 'Pattern for recurring blocked time (days, until date)';`
      ).catch(() => {
        // Comment might already exist, ignore error
      });

      console.log('🎉 Successfully updated sessions table schema');

    } catch (error) {
      console.error('❌ Error updating sessions table:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Removing added columns from sessions table...');
    
    try {
      // Remove the added columns in reverse order
      await queryInterface.removeColumn('sessions', 'deletedAt');
      await queryInterface.removeColumn('sessions', 'recurringPattern');
      await queryInterface.removeColumn('sessions', 'isRecurring');
      await queryInterface.removeColumn('sessions', 'reason');
      
      console.log('✅ Successfully removed added columns');
    } catch (error) {
      console.error('❌ Error removing columns:', error);
      throw error;
    }
  }
};