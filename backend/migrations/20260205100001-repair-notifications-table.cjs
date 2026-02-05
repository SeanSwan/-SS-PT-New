'use strict';

/**
 * REPAIR Migration: Fix Notifications Table
 * ==========================================
 * The original notifications migration used UUID for id/userId/senderId,
 * but the User model uses INTEGER. This fixes the type mismatch.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔧 Starting notifications table repair...');

      // Check if notifications table exists
      const tables = await queryInterface.showAllTables();

      if (tables.includes('notifications')) {
        // Check column types
        const tableInfo = await queryInterface.describeTable('notifications');

        // If id is UUID type, we need to recreate the table
        if (tableInfo.id && tableInfo.id.type && tableInfo.id.type.includes('UUID')) {
          console.log('⚠️ Found UUID columns in notifications table, recreating with INTEGER...');

          // Drop the table and recreate with correct types
          await queryInterface.dropTable('notifications', { transaction });

          await queryInterface.createTable('notifications', {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
            },
            title: {
              type: Sequelize.STRING,
              allowNull: false,
            },
            message: {
              type: Sequelize.TEXT,
              allowNull: false,
            },
            type: {
              type: Sequelize.STRING(20),
              allowNull: false,
              defaultValue: 'system',
            },
            read: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            link: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            image: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            userId: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE'
            },
            senderId: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'users',
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL'
            },
            createdAt: {
              allowNull: false,
              type: Sequelize.DATE,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
              allowNull: false,
              type: Sequelize.DATE,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
          }, { transaction });

          // Add indexes
          await queryInterface.addIndex('notifications', ['userId'], {
            name: 'idx_notifications_userId',
            transaction
          });
          await queryInterface.addIndex('notifications', ['read'], {
            name: 'idx_notifications_read',
            transaction
          });
          await queryInterface.addIndex('notifications', ['type'], {
            name: 'idx_notifications_type',
            transaction
          });

          console.log('✅ Notifications table recreated with INTEGER columns');
        } else {
          console.log('⏭️ Notifications table already has correct column types');
        }
      } else {
        // Create the table from scratch with correct types
        console.log('📝 Creating notifications table...');

        await queryInterface.createTable('notifications', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          title: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          type: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'system',
          },
          read: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          link: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          image: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          senderId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
          }
        }, { transaction });

        // Add indexes
        await queryInterface.addIndex('notifications', ['userId'], {
          name: 'idx_notifications_userId',
          transaction
        });
        await queryInterface.addIndex('notifications', ['read'], {
          name: 'idx_notifications_read',
          transaction
        });
        await queryInterface.addIndex('notifications', ['type'], {
          name: 'idx_notifications_type',
          transaction
        });

        console.log('✅ Notifications table created');
      }

      await transaction.commit();
      console.log('✅ Notifications repair migration completed!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Notifications repair migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // No-op - this is a repair migration
    console.log('⚠️ Down migration for notifications repair is a no-op');
  }
};
