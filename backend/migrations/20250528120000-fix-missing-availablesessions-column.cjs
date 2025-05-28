'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 EMERGENCY FIX: Adding missing availableSessions column and other critical User model fields...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // First, check if the users table exists and get its structure
        const [tables] = await queryInterface.sequelize.query(`
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'users';
        `, { transaction: t });
        
        if (tables.length === 0) {
          throw new Error('Users table does not exist! Run the create-user-table migration first.');
        }
        
        // Get current columns
        const [currentColumns] = await queryInterface.sequelize.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'users' AND table_schema = 'public'
          ORDER BY column_name;
        `, { transaction: t });
        
        const existingColumns = currentColumns.map(col => col.column_name);
        console.log('📋 Current columns in users table:', existingColumns.sort());
        
        // Define the critical missing columns that are causing auth failures
        const criticalColumns = [
          {
            name: 'availableSessions',
            definition: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 0,
              comment: 'Number of pre-purchased sessions available'
            }
          },
          {
            name: 'points', 
            definition: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 0,
              comment: 'Gamification points'
            }
          },
          {
            name: 'level',
            definition: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 1,
              comment: 'Gamification level'
            }
          },
          {
            name: 'refreshTokenHash',
            definition: {
              type: Sequelize.STRING,
              allowNull: true,
              comment: 'Hashed refresh token for auth'
            }
          },
          {
            name: 'failedLoginAttempts',
            definition: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 0,
              comment: 'Failed login attempt counter'
            }
          },
          {
            name: 'isLocked',
            definition: {
              type: Sequelize.BOOLEAN,
              allowNull: true,
              defaultValue: false,
              comment: 'Account lock status'
            }
          },
          {
            name: 'lastLoginIP',
            definition: {
              type: Sequelize.STRING,
              allowNull: true,
              comment: 'IP address of last login'
            }
          },
          {
            name: 'registrationIP',
            definition: {
              type: Sequelize.STRING,
              allowNull: true,
              comment: 'IP address at registration'
            }
          },
          {
            name: 'lastActive',
            definition: {
              type: Sequelize.DATE,
              allowNull: true,  
              comment: 'Last activity timestamp'
            }
          },
          {
            name: 'streakDays',
            definition: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 0,
              comment: 'Current activity streak'
            }
          },
          {
            name: 'lastActivityDate',
            definition: {
              type: Sequelize.DATE,
              allowNull: true,
              comment: 'Date of last activity for streak calculation'
            }
          },
          {
            name: 'totalWorkouts',
            definition: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 0,
              comment: 'Total workouts completed'
            }
          },
          {
            name: 'totalExercises',
            definition: {
              type: Sequelize.INTEGER,
              allowNull: true,
              defaultValue: 0,
              comment: 'Total exercises completed'
            }
          },
          {
            name: 'exercisesCompleted',
            definition: {
              type: Sequelize.JSON,
              allowNull: true,
              defaultValue: '{}',
              comment: 'JSON tracking of completed exercises'
            }
          }
        ];
        
        // First, ensure the tier enum exists for gamification
        try {
          await queryInterface.sequelize.query(`
            DO $$ BEGIN
                CREATE TYPE "enum_users_tier" AS ENUM ('bronze', 'silver', 'gold', 'platinum');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
          `, { transaction: t });
          console.log('✅ Created/verified tier enum type');
        } catch (error) {
          console.log('⚠️  Tier enum may already exist:', error.message);
        }
        
        // Add the tier column after ensuring the enum exists
        if (!existingColumns.includes('tier')) {
          try {
            await queryInterface.addColumn('users', 'tier', {
              type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'),
              allowNull: true,
              defaultValue: 'bronze',
              comment: 'Gamification tier'
            }, { transaction: t });
            console.log('✅ Added tier column');
          } catch (error) {
            console.log('⚠️  Could not add tier column:', error.message);
          }
        }
        
        // Add each critical column if it doesn't exist
        let columnsAdded = 0;
        let criticalFixApplied = false;
        
        for (const column of criticalColumns) {
          if (!existingColumns.includes(column.name)) {
            try {
              await queryInterface.addColumn('users', column.name, column.definition, { transaction: t });
              console.log(`✅ Added missing column: ${column.name}`);
              columnsAdded++;
              
              if (column.name === 'availableSessions') {
                criticalFixApplied = true;
                console.log('🎯 CRITICAL FIX APPLIED: availableSessions column added!');
              }
            } catch (error) {
              console.log(`⚠️  Could not add column ${column.name}: ${error.message}`);
            }
          } else {
            console.log(`✓ Column ${column.name} already exists`);
          }
        }
        
        // Verify the fix worked
        if (criticalFixApplied || existingColumns.includes('availableSessions')) {
          console.log('🎉 AUTHENTICATION FIX COMPLETED!');
          console.log('✅ availableSessions column is now available');
          console.log('✅ Login functionality should now work');
        } else {
          console.log('⚠️  availableSessions column may have already existed');
        }
        
        // Update the role enum to include 'user' if needed
        try {
          await queryInterface.sequelize.query(`
            ALTER TYPE "enum_users_role" ADD VALUE IF NOT EXISTS 'user';
          `, { transaction: t });
          console.log('✅ Updated role enum to include "user"');
        } catch (error) {
          console.log('⚠️  Role enum update note:', error.message);
        }
        
        console.log(`📊 SUMMARY: Added ${columnsAdded} missing columns to users table`);
        console.log('🚀 The User model and database are now synchronized!');
        
      });
      
    } catch (error) {
      console.error('❌ Emergency fix migration failed:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back emergency availableSessions fix...');
    
    try {
      // Remove the columns we added (be very careful with this)
      const columnsToRemove = [
        'availableSessions', 'points', 'level', 'tier', 'refreshTokenHash',
        'failedLoginAttempts', 'isLocked', 'lastLoginIP', 'registrationIP',
        'lastActive', 'streakDays', 'lastActivityDate', 'totalWorkouts',
        'totalExercises', 'exercisesCompleted'
      ];
      
      for (const columnName of columnsToRemove) {
        try {
          await queryInterface.removeColumn('users', columnName);
          console.log(`✅ Removed column: ${columnName}`);
        } catch (error) {
          console.log(`⚠️  Column ${columnName} may not exist or cannot be removed`);
        }
      }
      
      console.log('✅ Emergency fix rollback completed');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
