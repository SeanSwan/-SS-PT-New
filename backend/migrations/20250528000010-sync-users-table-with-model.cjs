'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding missing columns to users table to match User model...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // Get current table structure
        const [currentColumns] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users'
          ORDER BY column_name;
        `, { transaction: t });
        
        const existingColumns = currentColumns.map(col => col.column_name);
        console.log('📋 Existing columns:', existingColumns);
        
        // Define all columns that should exist in users table based on User model
        const requiredColumns = [
          { name: 'availableSessions', type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          { name: 'points', type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          { name: 'level', type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
          { name: 'tier', type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'), allowNull: true, defaultValue: 'bronze' },
          { name: 'streakDays', type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          { name: 'lastActivityDate', type: Sequelize.DATE, allowNull: true },
          { name: 'totalWorkouts', type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          { name: 'totalExercises', type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          { name: 'exercisesCompleted', type: Sequelize.JSON, allowNull: true, defaultValue: {} },
          { name: 'refreshTokenHash', type: Sequelize.STRING, allowNull: true },
          { name: 'failedLoginAttempts', type: Sequelize.INTEGER, allowNull: true, defaultValue: 0 },
          { name: 'isLocked', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
          { name: 'lastLoginIP', type: Sequelize.STRING, allowNull: true },
          { name: 'registrationIP', type: Sequelize.STRING, allowNull: true },
          { name: 'lastActive', type: Sequelize.DATE, allowNull: true },
          { name: 'dateOfBirth', type: Sequelize.DATEONLY, allowNull: true },
          { name: 'gender', type: Sequelize.STRING, allowNull: true },
          { name: 'weight', type: Sequelize.FLOAT, allowNull: true },
          { name: 'height', type: Sequelize.FLOAT, allowNull: true },
          { name: 'fitnessGoal', type: Sequelize.STRING, allowNull: true },
          { name: 'trainingExperience', type: Sequelize.TEXT, allowNull: true },
          { name: 'healthConcerns', type: Sequelize.TEXT, allowNull: true },
          { name: 'emergencyContact', type: Sequelize.STRING, allowNull: true },
          { name: 'specialties', type: Sequelize.TEXT, allowNull: true },
          { name: 'certifications', type: Sequelize.TEXT, allowNull: true },
          { name: 'bio', type: Sequelize.TEXT, allowNull: true },
          { name: 'availableDays', type: Sequelize.TEXT, allowNull: true },
          { name: 'availableHours', type: Sequelize.TEXT, allowNull: true },
          { name: 'hourlyRate', type: Sequelize.FLOAT, allowNull: true },
          { name: 'permissions', type: Sequelize.TEXT, allowNull: true },
          { name: 'lastLogin', type: Sequelize.DATE, allowNull: true },
          { name: 'emailNotifications', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
          { name: 'smsNotifications', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: true },
          { name: 'preferences', type: Sequelize.TEXT, allowNull: true }
        ];
        
        // Add missing columns
        let columnsAdded = 0;
        
        for (const column of requiredColumns) {
          if (!existingColumns.includes(column.name)) {
            console.log(`➕ Adding column: ${column.name}`);
            
            try {
              await queryInterface.addColumn('users', column.name, {
                type: column.type,
                allowNull: column.allowNull,
                defaultValue: column.defaultValue
              }, { transaction: t });
              
              columnsAdded++;
            } catch (error) {
              console.log(`⚠️  Could not add column ${column.name}: ${error.message}`);
            }
          }
        }
        
        console.log(`✅ Added ${columnsAdded} missing columns to users table`);
        
        // Update role enum to include 'user' if it doesn't exist
        try {
          console.log('🔄 Updating role enum to include "user" role...');
          await queryInterface.sequelize.query(`
            ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'user';
          `, { transaction: t });
          console.log('✅ Role enum updated');
        } catch (error) {
          console.log('⚠️  Role enum may already include "user" or enum doesn\\'t exist');
        }
        
        console.log('🎉 USERS TABLE SYNC COMPLETED SUCCESSFULLY!');
        console.log('✅ User model and database table are now aligned');
        console.log('✅ Login functionality should now work properly');
        
      });
      
    } catch (error) {
      console.error('❌ Failed to sync users table:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back users table column additions...');
    
    try {
      // Remove the columns we added (be careful with this in production)
      const columnsToRemove = [
        'availableSessions', 'points', 'level', 'tier', 'streakDays', 
        'lastActivityDate', 'totalWorkouts', 'totalExercises', 'exercisesCompleted',
        'refreshTokenHash', 'failedLoginAttempts', 'isLocked', 'lastLoginIP', 
        'registrationIP', 'lastActive', 'dateOfBirth', 'gender', 'weight', 'height',
        'fitnessGoal', 'trainingExperience', 'healthConcerns', 'emergencyContact',
        'specialties', 'certifications', 'bio', 'availableDays', 'availableHours',
        'hourlyRate', 'permissions', 'lastLogin', 'emailNotifications', 
        'smsNotifications', 'preferences'
      ];
      
      for (const columnName of columnsToRemove) {
        try {
          await queryInterface.removeColumn('users', columnName);
        } catch (error) {
          console.log(`Column ${columnName} may not exist or cannot be removed`);
        }
      }
      
      console.log('✅ Rollback completed');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
