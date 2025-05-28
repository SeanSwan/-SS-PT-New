'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 EMERGENCY FIX: Repairing incomplete sessions table...');
    
    try {
      // Check if sessions table exists
      const [tableExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'sessions'
        );
      `);
      
      if (!tableExists[0].exists) {
        console.log('Sessions table does not exist. Creating complete table...');
        
        // Create the complete sessions table
        await queryInterface.createTable('sessions', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
          },
          sessionDate: {
            type: Sequelize.DATE,
            allowNull: false
          },
          duration: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 60
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            }
          },
          trainerId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            }
          },
          location: {
            type: Sequelize.STRING,
            allowNull: true
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          status: {
            type: Sequelize.ENUM('available', 'requested', 'scheduled', 'confirmed', 'completed', 'cancelled'),
            allowNull: false,
            defaultValue: 'available'
          },
          cancellationReason: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          cancelledBy: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            }
          },
          sessionDeducted: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          deductionDate: {
            type: Sequelize.DATE,
            allowNull: true
          },
          confirmed: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          reminderSent: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          reminderSentDate: {
            type: Sequelize.DATE,
            allowNull: true
          },
          feedbackProvided: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          rating: {
            type: Sequelize.INTEGER,
            allowNull: true
          },
          feedback: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE
          }
        });
        
        console.log('✅ Complete sessions table created');
        
      } else {
        console.log('Sessions table exists. Checking for missing columns...');
        
        // Get all existing columns
        const [columns] = await queryInterface.sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'sessions' 
          ORDER BY ordinal_position;
        `);
        
        const existingColumns = columns.map(col => col.column_name);
        console.log('Existing columns:', existingColumns);
        
        // Define all required columns
        const requiredColumns = {
          trainerId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            }
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            }
          },
          location: {
            type: Sequelize.STRING,
            allowNull: true
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          cancellationReason: {
            type: Sequelize.TEXT,
            allowNull: true
          },
          cancelledBy: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            }
          },
          sessionDeducted: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          deductionDate: {
            type: Sequelize.DATE,
            allowNull: true
          },
          confirmed: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          reminderSent: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          reminderSentDate: {
            type: Sequelize.DATE,
            allowNull: true
          },
          feedbackProvided: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          },
          rating: {
            type: Sequelize.INTEGER,
            allowNull: true
          },
          feedback: {
            type: Sequelize.TEXT,
            allowNull: true
          }
        };
        
        // Add missing columns
        for (const [columnName, columnDef] of Object.entries(requiredColumns)) {
          if (!existingColumns.includes(columnName)) {
            console.log(`Adding missing column: ${columnName}`);
            await queryInterface.addColumn('sessions', columnName, columnDef);
          }
        }
        
        console.log('✅ All missing columns added to sessions table');
      }
      
      // Ensure indexes exist
      try {
        await queryInterface.addIndex('sessions', ['sessionDate'], { 
          name: 'sessions_session_date_idx',
          unique: false 
        });
      } catch (e) {
        console.log('Index sessionDate already exists or failed to create:', e.message);
      }
      
      try {
        await queryInterface.addIndex('sessions', ['userId'], { 
          name: 'sessions_user_id_idx',
          unique: false 
        });
      } catch (e) {
        console.log('Index userId already exists or failed to create:', e.message);
      }
      
      try {
        await queryInterface.addIndex('sessions', ['trainerId'], { 
          name: 'sessions_trainer_id_idx',
          unique: false 
        });
      } catch (e) {
        console.log('Index trainerId already exists or failed to create:', e.message);
      }
      
      console.log('✅ Sessions table repair completed successfully!');
      
    } catch (error) {
      console.error('❌ Error during sessions table repair:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // This is a repair migration, so we don't want to reverse it
    console.log('This is a repair migration - no rollback action taken');
  }
};
