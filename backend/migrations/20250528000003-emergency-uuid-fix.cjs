'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚨 EMERGENCY: Executing direct SQL fix for all UUID mismatches...');
    
    try {
      // Execute the comprehensive fix in one transaction
      await queryInterface.sequelize.transaction(async (t) => {
        
        // Step 1: Drop all dependent tables first (in correct order)
        console.log('🔥 Dropping dependent tables...');
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS order_items CASCADE;', { transaction: t });
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS orders CASCADE;', { transaction: t });
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS cart_items CASCADE;', { transaction: t });
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS shopping_carts CASCADE;', { transaction: t });
        await queryInterface.sequelize.query('DROP TABLE IF EXISTS food_scan_history CASCADE;', { transaction: t });
        
        // Step 2: Recreate shopping_carts with correct UUID userId
        console.log('📋 Creating shopping_carts with UUID userId...');
        await queryInterface.sequelize.query(`
          CREATE TABLE shopping_carts (
              id SERIAL PRIMARY KEY,
              status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
              "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
              "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `, { transaction: t });
        
        // Step 3: Recreate cart_items
        console.log('📋 Creating cart_items...');
        await queryInterface.sequelize.query(`
          CREATE TABLE cart_items (
              id SERIAL PRIMARY KEY,
              "cartId" INTEGER NOT NULL REFERENCES shopping_carts(id) ON UPDATE CASCADE ON DELETE CASCADE,
              "storefrontItemId" INTEGER NOT NULL REFERENCES storefront_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
              quantity INTEGER NOT NULL DEFAULT 1,
              price DECIMAL(10,2) NOT NULL,
              "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `, { transaction: t });
        
        // Step 4: Recreate orders with correct UUID userId
        console.log('📋 Creating orders with UUID userId...');
        await queryInterface.sequelize.query(`
          CREATE TABLE orders (
              id SERIAL PRIMARY KEY,
              "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
              "cartId" INTEGER REFERENCES shopping_carts(id) ON UPDATE CASCADE ON DELETE SET NULL,
              "orderNumber" VARCHAR(255) NOT NULL UNIQUE,
              "totalAmount" DECIMAL(10,2) NOT NULL,
              status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'refunded', 'failed')),
              "paymentMethod" VARCHAR(255),
              "paymentId" VARCHAR(255),
              "stripePaymentIntentId" VARCHAR(255),
              "billingEmail" VARCHAR(255),
              "billingName" VARCHAR(255),
              "shippingAddress" JSON,
              notes TEXT,
              "completedAt" TIMESTAMP WITH TIME ZONE,
              "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `, { transaction: t });
        
        // Step 5: Recreate order_items
        console.log('📋 Creating order_items...');
        await queryInterface.sequelize.query(`
          CREATE TABLE order_items (
              id SERIAL PRIMARY KEY,
              "orderId" INTEGER NOT NULL REFERENCES orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
              "storefrontItemId" INTEGER NOT NULL REFERENCES storefront_items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
              name VARCHAR(255) NOT NULL,
              description TEXT,
              quantity INTEGER NOT NULL DEFAULT 1,
              price DECIMAL(10,2) NOT NULL,
              subtotal DECIMAL(10,2) NOT NULL,
              "itemType" VARCHAR(255),
              "imageUrl" VARCHAR(255),
              metadata JSON,
              "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `, { transaction: t });
        
        // Step 6: Recreate food_scan_history with correct UUID userId
        console.log('📋 Creating food_scan_history with UUID userId...');
        await queryInterface.sequelize.query(`
          CREATE TABLE food_scan_history (
              id SERIAL PRIMARY KEY,
              "userId" UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
              "productName" VARCHAR(255) NOT NULL,
              "productCode" VARCHAR(255),
              "scanDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "nutritionData" JSON,
              "imageUrl" VARCHAR(255),
              "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          );
        `, { transaction: t });
        
        // Step 7: Add performance indexes
        console.log('📊 Adding performance indexes...');
        await queryInterface.sequelize.query('CREATE INDEX idx_shopping_carts_userid ON shopping_carts("userId");', { transaction: t });
        await queryInterface.sequelize.query('CREATE INDEX idx_cart_items_cartid ON cart_items("cartId");', { transaction: t });
        await queryInterface.sequelize.query('CREATE INDEX idx_cart_items_storefrontitemid ON cart_items("storefrontItemId");', { transaction: t });
        await queryInterface.sequelize.query('CREATE INDEX idx_orders_userid ON orders("userId");', { transaction: t });
        await queryInterface.sequelize.query('CREATE INDEX idx_orders_ordernumber ON orders("orderNumber");', { transaction: t });
        await queryInterface.sequelize.query('CREATE INDEX idx_orders_status ON orders(status);', { transaction: t });
        await queryInterface.sequelize.query('CREATE INDEX idx_orders_createdat ON orders("createdAt");', { transaction: t });
        await queryInterface.sequelize.query('CREATE INDEX idx_order_items_orderid ON order_items("orderId");', { transaction: t });
        await queryInterface.sequelize.query('CREATE INDEX idx_order_items_storefrontitemid ON order_items("storefrontItemId");', { transaction: t });
        await queryInterface.sequelize.query('CREATE INDEX idx_food_scan_history_userid ON food_scan_history("userId");', { transaction: t });
        await queryInterface.sequelize.query('CREATE INDEX idx_food_scan_history_scandate ON food_scan_history("scanDate");', { transaction: t });
        
        console.log('✅ All tables recreated with correct UUID foreign keys!');
      });
      
      console.log('🎉 EMERGENCY UUID FIX COMPLETED SUCCESSFULLY!');
      
    } catch (error) {
      console.error('❌ Emergency UUID fix failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('This is an emergency repair migration - no rollback implemented');
  }
};
