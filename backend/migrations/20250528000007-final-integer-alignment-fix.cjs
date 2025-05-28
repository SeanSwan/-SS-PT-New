'use strict';

/**
 * FINAL INTEGER ALIGNMENT FIX
 * ==========================
 * This migration aligns all models with the reality that users.id is INTEGER in production.
 * It ensures all foreign key relationships use INTEGER data types consistently.
 * 
 * This resolves the session purchase flow from shopping cart → order → session allocation
 * enabling proper display in client, trainer, and admin dashboards.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 FINAL FIX: Aligning all foreign keys with INTEGER users.id...');
    
    try {
      await queryInterface.sequelize.transaction(async (t) => {
        
        // First, verify the users table id column type
        const [results] = await queryInterface.sequelize.query(
          `SELECT data_type, column_name FROM information_schema.columns 
           WHERE table_name = 'users' AND column_name = 'id';`,
          { transaction: t }
        );
        
        console.log('Users table ID column type:', results);
        
        // If users.id is not integer, we need to stop and investigate
        if (results.length === 0 || results[0].data_type !== 'integer') {
          throw new Error(`Expected users.id to be INTEGER, found: ${results[0]?.data_type || 'not found'}`);
        }
        
        console.log('✅ Confirmed: users.id is INTEGER type');
        
        // Step 1: Drop all dependent tables that may have wrong UUID foreign keys
        console.log('🔥 Dropping tables with UUID foreign key issues...');
        
        const tablesToDrop = [
          'order_items',
          'orders', 
          'cart_items',
          'shopping_carts',
          'notifications',
          'food_scan_history'
        ];
        
        for (const table of tablesToDrop) {
          try {
            await queryInterface.dropTable(table, { transaction: t, cascade: true });
            console.log(`✅ Dropped ${table}`);
          } catch (error) {
            console.log(`⚠️ Table ${table} doesn't exist or already dropped`);
          }
        }
        
        // Step 2: Create shopping_carts with INTEGER userId
        console.log('📋 Creating shopping_carts with INTEGER userId...');
        await queryInterface.createTable('shopping_carts', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          status: {
            type: Sequelize.ENUM('active', 'completed'),
            defaultValue: 'active',
            allowNull: false,
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
          checkoutSessionId: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          paymentStatus: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          completedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          lastActivityAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          checkoutSessionExpired: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        }, { transaction: t });
        
        // Step 3: Create cart_items
        console.log('📋 Creating cart_items...');
        await queryInterface.createTable('cart_items', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          cartId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'shopping_carts',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          storefrontItemId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'storefront_items',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          quantity: {
            type: Sequelize.INTEGER,
            defaultValue: 1,
            allowNull: false,
          },
          price: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        }, { transaction: t });
        
        // Step 4: Create orders with INTEGER userId
        console.log('📋 Creating orders with INTEGER userId...');
        await queryInterface.createTable('orders', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT'
          },
          cartId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'shopping_carts',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          orderNumber: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          totalAmount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
          },
          status: {
            type: Sequelize.ENUM('pending', 'processing', 'completed', 'refunded', 'failed'),
            defaultValue: 'pending',
            allowNull: false,
          },
          paymentMethod: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          paymentId: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          billingEmail: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          billingName: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          shippingAddress: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          completedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        }, { transaction: t });
        
        // Step 5: Create order_items
        console.log('📋 Creating order_items...');
        await queryInterface.createTable('order_items', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          orderId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'orders',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          storefrontItemId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'storefront_items',
              key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT'
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          quantity: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          price: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
          },
          subtotal: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
          },
          itemType: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          imageUrl: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          metadata: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        }, { transaction: t });
        
        // Step 6: Create notifications with INTEGER user foreign keys
        console.log('📋 Creating notifications with INTEGER user foreign keys...');
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
            type: Sequelize.ENUM('orientation', 'system', 'order', 'workout', 'client', 'admin'),
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
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        }, { transaction: t });
        
        // Step 7: Ensure sessions table has correct INTEGER foreign keys
        console.log('🔧 Updating sessions table to use INTEGER foreign keys...');
        
        // Check if sessions table exists and what columns it has
        const sessionsInfo = await queryInterface.describeTable('sessions', { transaction: t });
        
        if (sessionsInfo.userId && sessionsInfo.userId.type.includes('uuid')) {
          console.log('⚠️ Sessions table has UUID foreign keys, updating...');
          
          // Drop and recreate sessions table with correct INTEGER foreign keys
          await queryInterface.dropTable('sessions', { transaction: t, cascade: true });
          
          await queryInterface.createTable('sessions', {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true
            },
            sessionDate: {
              type: Sequelize.DATE,
              allowNull: false,
            },
            duration: {
              type: Sequelize.INTEGER,
              allowNull: false,
              defaultValue: 60,
            },
            userId: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'users',
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL'
            },
            trainerId: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'users',
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL'
            },
            location: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            notes: {
              type: Sequelize.TEXT,
              allowNull: true,
            },
            reason: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            isRecurring: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            recurringPattern: {
              type: Sequelize.JSON,
              allowNull: true,
            },
            status: {
              type: Sequelize.STRING,
              allowNull: false,
              defaultValue: 'available',
            },
            cancellationReason: {
              type: Sequelize.TEXT,
              allowNull: true,
            },
            cancelledBy: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: 'users',
                key: 'id'
              },
              onUpdate: 'CASCADE',
              onDelete: 'SET NULL'
            },
            sessionDeducted: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            deductionDate: {
              type: Sequelize.DATE,
              allowNull: true,
            },
            confirmed: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            reminderSent: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            reminderSentDate: {
              type: Sequelize.DATE,
              allowNull: true,
            },
            feedbackProvided: {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: false,
            },
            rating: {
              type: Sequelize.INTEGER,
              allowNull: true,
            },
            feedback: {
              type: Sequelize.TEXT,
              allowNull: true,
            },
            createdAt: {
              allowNull: false,
              type: Sequelize.DATE,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updatedAt: {
              allowNull: false,
              type: Sequelize.DATE,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            deletedAt: {
              allowNull: true,
              type: Sequelize.DATE,
            },
          }, { transaction: t });
          
          console.log('✅ Sessions table recreated with INTEGER foreign keys');
        } else {
          console.log('✅ Sessions table already has correct foreign key types');
        }
        
        // Step 8: Add performance indexes
        console.log('📊 Adding performance indexes...');
        await queryInterface.addIndex('shopping_carts', ['userId'], { transaction: t });
        await queryInterface.addIndex('shopping_carts', ['status'], { transaction: t });
        await queryInterface.addIndex('cart_items', ['cartId'], { transaction: t });
        await queryInterface.addIndex('cart_items', ['storefrontItemId'], { transaction: t });
        await queryInterface.addIndex('orders', ['userId'], { transaction: t });
        await queryInterface.addIndex('orders', ['orderNumber'], { transaction: t });
        await queryInterface.addIndex('orders', ['status'], { transaction: t });
        await queryInterface.addIndex('orders', ['createdAt'], { transaction: t });
        await queryInterface.addIndex('order_items', ['orderId'], { transaction: t });
        await queryInterface.addIndex('order_items', ['storefrontItemId'], { transaction: t });
        await queryInterface.addIndex('notifications', ['userId'], { transaction: t });
        await queryInterface.addIndex('notifications', ['senderId'], { transaction: t });
        await queryInterface.addIndex('notifications', ['read'], { transaction: t });
        await queryInterface.addIndex('sessions', ['userId'], { transaction: t });
        await queryInterface.addIndex('sessions', ['trainerId'], { transaction: t });
        await queryInterface.addIndex('sessions', ['sessionDate'], { transaction: t });
        await queryInterface.addIndex('sessions', ['status'], { transaction: t });
        
        console.log('✅ All indexes created successfully');
        
        console.log('🎉 FINAL INTEGER ALIGNMENT FIX COMPLETED SUCCESSFULLY!');
        console.log('✅ All foreign keys now properly reference INTEGER users.id');
        console.log('✅ Session purchase flow: Cart → Order → Session allocation enabled');
        console.log('✅ Client/Trainer/Admin dashboards can display purchased sessions');
      });
      
    } catch (error) {
      console.error('❌ Final integer alignment fix failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('This is a comprehensive fix migration - rollback would require manual intervention');
    console.log('Contact development team if rollback is needed');
  }
};
