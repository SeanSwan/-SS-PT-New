'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 HOTFIX: Ensuring shopping_carts table exists...');
    
    try {
      // Check if shopping_carts table exists
      const [shoppingCartsExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'shopping_carts'
        );
      `);
      
      if (!shoppingCartsExists[0].exists) {
        console.log('📋 Creating missing shopping_carts table...');
        
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
            type: Sequelize.INTEGER,
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
        
        console.log('✅ shopping_carts table created');
      } else {
        console.log('✅ shopping_carts table already exists');
      }
      
      // Check if cart_items table exists
      const [cartItemsExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'cart_items'
        );
      `);
      
      if (!cartItemsExists[0].exists) {
        console.log('📋 Creating missing cart_items table...');
        
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
        
        console.log('✅ cart_items table created');
      } else {
        console.log('✅ cart_items table already exists');
      }
      
      console.log('🎉 Shopping cart tables hotfix completed!');
      
    } catch (error) {
      console.error('❌ Error during shopping cart hotfix:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Dropping cart_items and shopping_carts tables...');
    await queryInterface.dropTable('cart_items', { cascade: true });
    await queryInterface.dropTable('shopping_carts', { cascade: true });
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_shopping_carts_status";');
  }
};
