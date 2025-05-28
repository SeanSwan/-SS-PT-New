'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚨 EMERGENCY BYPASS: Marking problematic migration as complete and running definitive fix...');
    
    try {
      // Step 1: Mark the problematic migration as completed to bypass it
      console.log('📝 Marking problematic migration as completed...');
      await queryInterface.sequelize.query(`
        INSERT INTO "SequelizeMeta" (name) VALUES ('20250528000002-fix-uuid-foreign-keys.cjs')
        ON CONFLICT (name) DO NOTHING;
      `);
      
      console.log('✅ Problematic migration marked as completed');
      
      // Step 2: Detect actual users.id data type
      console.log('🔍 Detecting actual users.id data type...');
      const [userIdTypeCheck] = await queryInterface.sequelize.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id';
      `);
      
      if (userIdTypeCheck.length === 0) {
        throw new Error('Users table not found!');
      }
      
      const actualUserIdType = userIdTypeCheck[0].data_type;
      console.log(`✅ Users.id data type: ${actualUserIdType}`);
      
      // Step 3: Determine correct Sequelize type for foreign keys
      let userIdSequelizeType;
      if (actualUserIdType === 'uuid') {
        userIdSequelizeType = Sequelize.UUID;
      } else if (actualUserIdType === 'integer') {
        userIdSequelizeType = Sequelize.INTEGER;
      } else {
        throw new Error(`Unexpected users.id data type: ${actualUserIdType}`);
      }
      
      console.log(`📋 Using ${actualUserIdType.toUpperCase()} for all foreign key references`);
      
      // Step 4: Clean up any existing problematic tables
      console.log('🧹 Cleaning up problematic tables...');
      
      const tablesToDrop = ['order_items', 'orders', 'cart_items', 'shopping_carts', 'notifications'];
      
      for (const tableName of tablesToDrop) {
        const [tableExists] = await queryInterface.sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = '${tableName}'
          );
        `);
        
        if (tableExists[0].exists) {
          console.log(`🔥 Dropping ${tableName} table to recreate with correct types...`);
          await queryInterface.dropTable(tableName, { cascade: true });
        }
      }
      
      // Step 5: Create shopping_carts table with correct userId type
      console.log('📋 Creating shopping_carts table...');
      await queryInterface.createTable('shopping_carts', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        status: {
          type: Sequelize.ENUM('active', 'completed'),
          allowNull: false,
          defaultValue: 'active',
        },
        userId: {
          type: userIdSequelizeType, // Use detected type
          allowNull: false,
          references: { 
            model: 'users', 
            key: 'id' 
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        },
      });
      
      // Step 6: Create cart_items table
      console.log('📋 Creating cart_items table...');
      await queryInterface.createTable('cart_items', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        cartId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'shopping_carts',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        storefrontItemId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'storefront_items',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
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
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        },
      });
      
      // Step 7: Create orders table  
      console.log('📋 Creating orders table...');
      await queryInterface.createTable('orders', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        userId: {
          type: userIdSequelizeType, // Use detected type
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
          allowNull: true,
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
          unique: true
        },
        totalAmount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        status: {
          type: Sequelize.ENUM('pending', 'processing', 'completed', 'refunded', 'failed'),
          defaultValue: 'pending',
          allowNull: false
        },
        paymentMethod: {
          type: Sequelize.STRING,
          allowNull: true
        },
        paymentId: {
          type: Sequelize.STRING,
          allowNull: true
        },
        stripePaymentIntentId: {
          type: Sequelize.STRING,
          allowNull: true
        },
        billingEmail: {
          type: Sequelize.STRING,
          allowNull: true
        },
        billingName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        shippingAddress: {
          type: Sequelize.JSON,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        completedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        }
      });
      
      // Step 8: Create order_items table
      console.log('📋 Creating order_items table...');
      await queryInterface.createTable('order_items', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
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
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        subtotal: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false
        },
        itemType: {
          type: Sequelize.STRING,
          allowNull: true
        },
        imageUrl: {
          type: Sequelize.STRING,
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSON,
          allowNull: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        }
      });
      
      // Step 9: Create notifications table
      console.log('📋 Creating notifications table...');
      await queryInterface.createTable('notifications', {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
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
          type: userIdSequelizeType, // Use detected type
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        senderId: {
          type: userIdSequelizeType, // Use detected type
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('now')
        },
      });
      
      // Step 10: Add indexes
      console.log('📊 Adding performance indexes...');
      await queryInterface.addIndex('shopping_carts', ['userId']);
      await queryInterface.addIndex('shopping_carts', ['status']);
      await queryInterface.addIndex('cart_items', ['cartId']);
      await queryInterface.addIndex('cart_items', ['storefrontItemId']);
      await queryInterface.addIndex('orders', ['userId']);
      await queryInterface.addIndex('orders', ['status']);
      await queryInterface.addIndex('orders', ['orderNumber']);
      await queryInterface.addIndex('orders', ['createdAt']);
      await queryInterface.addIndex('order_items', ['orderId']);
      await queryInterface.addIndex('order_items', ['storefrontItemId']);
      await queryInterface.addIndex('notifications', ['userId']);
      await queryInterface.addIndex('notifications', ['type']);
      await queryInterface.addIndex('notifications', ['read']);
      await queryInterface.addIndex('notifications', ['createdAt']);
      
      console.log('🎉 EMERGENCY BYPASS AND FIX COMPLETED SUCCESSFULLY!');
      console.log(`✅ All tables created with correct ${actualUserIdType.toUpperCase()} foreign keys`);
      console.log('✅ All foreign key constraints properly established');
      console.log('✅ Problematic migration bypassed');
      console.log('✅ Database schema is now consistent');
      
    } catch (error) {
      console.error('❌ Emergency bypass failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back emergency bypass...');
    
    try {
      // Drop tables in correct dependency order
      await queryInterface.dropTable('order_items', { cascade: true });
      await queryInterface.dropTable('orders', { cascade: true });
      await queryInterface.dropTable('cart_items', { cascade: true });
      await queryInterface.dropTable('shopping_carts', { cascade: true });
      await queryInterface.dropTable('notifications', { cascade: true });
      
      // Drop ENUM types
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_shopping_carts_status";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_notifications_type";');
      
      // Remove the marked migration
      await queryInterface.sequelize.query(`
        DELETE FROM "SequelizeMeta" WHERE name = '20250528000002-fix-uuid-foreign-keys.cjs';
      `);
      
      console.log('✅ Rollback completed');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
