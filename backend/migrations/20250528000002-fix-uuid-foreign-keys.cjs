'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 EMERGENCY FIX: Resolving UUID vs INTEGER foreign key mismatches...');
    
    try {
      // First, let's check what data types we're actually dealing with
      const [userIdTypeCheck] = await queryInterface.sequelize.query(`
        SELECT data_type, column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id';
      `);
      
      console.log('Users table ID column type:', userIdTypeCheck);
      
      // Check if orders table exists and what data type userId has
      const [ordersTableCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'orders'
        );
      `);
      
      if (ordersTableCheck[0].exists) {
        console.log('Orders table exists, checking userId column...');
        
        const [orderUserIdCheck] = await queryInterface.sequelize.query(`
          SELECT data_type, column_name 
          FROM information_schema.columns 
          WHERE table_name = 'orders' AND column_name = 'userId';
        `);
        
        console.log('Orders userId column type:', orderUserIdCheck);
        
        // If orders table exists with wrong data type, drop it
        if (orderUserIdCheck.length > 0 && orderUserIdCheck[0].data_type !== 'integer') {
          console.log('🔥 Dropping orders table with incorrect userId data type...');
          await queryInterface.dropTable('orders', { cascade: true });
          console.log('✅ Orders table dropped');
        }
      }
      
      // Check if order_items table exists (might have been created)
      const [orderItemsTableCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'order_items'
        );
      `);
      
      if (orderItemsTableCheck[0].exists) {
        console.log('🔥 Dropping order_items table to recreate with correct references...');
        await queryInterface.dropTable('order_items', { cascade: true });
        console.log('✅ Order_items table dropped');
      }
      
      // Check if shopping_carts table has correct userId data type
      const [cartsTableCheck] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'shopping_carts'
        );
      `);
      
      if (cartsTableCheck[0].exists) {
        console.log('Shopping_carts table exists, checking userId column...');
        
        const [cartUserIdCheck] = await queryInterface.sequelize.query(`
          SELECT data_type, column_name 
          FROM information_schema.columns 
          WHERE table_name = 'shopping_carts' AND column_name = 'userId';
        `);
        
        if (cartUserIdCheck.length > 0 && cartUserIdCheck[0].data_type !== 'integer') {
          console.log('🔥 Shopping_carts table has incorrect userId data type, fixing...');
          
          // Drop cart_items first (foreign key dependency)
          const [cartItemsExists] = await queryInterface.sequelize.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'cart_items'
            );
          `);
          
          if (cartItemsExists[0].exists) {
            console.log('🔥 Dropping cart_items table first...');
            await queryInterface.dropTable('cart_items', { cascade: true });
          }
          
          console.log('🔥 Dropping shopping_carts table with incorrect userId data type...');
          await queryInterface.dropTable('shopping_carts', { cascade: true });
          
          // Recreate shopping_carts with correct INTEGER userId
          console.log('📋 Recreating shopping_carts table with INTEGER userId...');
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
              type: Sequelize.INTEGER,  // Fixed to INTEGER to match users.id
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
          
          // Recreate cart_items table
          console.log('📋 Recreating cart_items table...');
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
              type: Sequelize.DECIMAL(10, 2), // Changed from FLOAT to DECIMAL
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
          
          console.log('✅ Shopping_carts and cart_items tables recreated with correct data types');
        }
      }
      
      // Now create the orders table with correct INTEGER data types
      console.log('📋 Creating orders table with correct INTEGER data types...');
      
      await queryInterface.createTable('orders', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        userId: {
          type: Sequelize.INTEGER,  // Changed to INTEGER to match users.id
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
          allowNull: true, // Made nullable in case cart doesn't exist
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
          type: Sequelize.DECIMAL(10, 2), // Changed from FLOAT to DECIMAL for currency
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
      
      console.log('✅ Orders table created with INTEGER userId');
      
      // Create order_items table
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
          type: Sequelize.DECIMAL(10, 2), // Changed from FLOAT to DECIMAL
          allowNull: false
        },
        subtotal: {
          type: Sequelize.DECIMAL(10, 2), // Changed from FLOAT to DECIMAL
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
      
      console.log('✅ Order_items table created');
      
      // Add indexes for performance (with existence checks)
      console.log('📊 Adding indexes...');
      
      // Helper function to check if index exists
      const indexExists = async (indexName) => {
        const [result] = await queryInterface.sequelize.query(
          `SELECT indexname FROM pg_indexes WHERE indexname = '${indexName}';`
        );
        return result.length > 0;
      };
      
      // Add indexes only if they don't exist
      const indexesToCreate = [
        { table: 'orders', column: 'userId', name: 'orders_user_id' },
        { table: 'orders', column: 'orderNumber', name: 'orders_order_number' },
        { table: 'orders', column: 'status', name: 'orders_status' },
        { table: 'orders', column: 'createdAt', name: 'orders_created_at' },
        { table: 'order_items', column: 'orderId', name: 'order_items_order_id' },
        { table: 'order_items', column: 'storefrontItemId', name: 'order_items_storefront_item_id' }
      ];
      
      for (const index of indexesToCreate) {
        if (!(await indexExists(index.name))) {
          await queryInterface.addIndex(index.table, [index.column]);
          console.log(`✅ Created index on ${index.table}.${index.column}`);
        } else {
          console.log(`⚠️ Index ${index.name} already exists, skipping`);
        }
      }
      
      console.log('✅ All indexes processed');
      console.log('🎉 Orders table UUID fix completed successfully!');
      
    } catch (error) {
      console.error('❌ Error during UUID fix:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Dropping orders and order_items tables...');
    await queryInterface.dropTable('order_items', { cascade: true });
    await queryInterface.dropTable('orders', { cascade: true });
    
    // Drop the status enum
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
  }
};
