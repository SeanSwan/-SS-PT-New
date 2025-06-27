'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Adding missing payment fields to shopping_carts table...');
    
    try {
      // Check if shopping_carts table exists first
      const [tableExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'shopping_carts'
        );
      `);
      
      if (!tableExists[0].exists) {
        throw new Error('shopping_carts table does not exist. Run prerequisite migrations first.');
      }
      
      // Get existing columns
      const [existingColumns] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'shopping_carts';
      `);
      
      const columnNames = existingColumns.map(row => row.column_name);
      console.log('📋 Existing columns:', columnNames);
      
      // Add payment-related fields if they don't exist
      const fieldsToAdd = [
        {
          name: 'paymentIntentId',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Stripe Payment Intent ID for tracking payments'
          }
        },
        {
          name: 'total',
          definition: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0.00,
            comment: 'Calculated total amount for the cart'
          }
        },
        {
          name: 'checkoutSessionId',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Stripe Checkout Session ID (for legacy checkout)'
          }
        },
        {
          name: 'paymentStatus',
          definition: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Payment status: pending, paid, failed, cancelled'
          }
        },
        {
          name: 'completedAt',
          definition: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Timestamp when the order was completed'
          }
        },
        {
          name: 'lastActivityAt',
          definition: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Last time cart was modified'
          }
        },
        {
          name: 'checkoutSessionExpired',
          definition: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether the checkout session has expired'
          }
        }
      ];
      
      // Add each field if it doesn't exist
      for (const field of fieldsToAdd) {
        if (!columnNames.includes(field.name)) {
          console.log(`➕ Adding column: ${field.name}`);
          await queryInterface.addColumn('shopping_carts', field.name, field.definition);
        } else {
          console.log(`✅ Column already exists: ${field.name}`);
        }
      }
      
      // Create an index on paymentIntentId for faster lookups
      try {
        await queryInterface.addIndex('shopping_carts', ['paymentIntentId'], {
          name: 'idx_shopping_carts_payment_intent_id',
          unique: false
        });
        console.log('📊 Created index on paymentIntentId');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Index on paymentIntentId already exists');
        } else {
          console.warn('⚠️ Could not create index on paymentIntentId:', error.message);
        }
      }
      
      // Create an index on userId for faster user cart lookups
      try {
        await queryInterface.addIndex('shopping_carts', ['userId'], {
          name: 'idx_shopping_carts_user_id',
          unique: false
        });
        console.log('📊 Created index on userId');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Index on userId already exists');
        } else {
          console.warn('⚠️ Could not create index on userId:', error.message);
        }
      }
      
      console.log('🎉 Payment fields added to shopping_carts table successfully!');
      
    } catch (error) {
      console.error('❌ Error adding payment fields to shopping_carts:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('🔙 Removing payment fields from shopping_carts table...');
    
    try {
      // Remove indexes first
      await queryInterface.removeIndex('shopping_carts', 'idx_shopping_carts_payment_intent_id');
      await queryInterface.removeIndex('shopping_carts', 'idx_shopping_carts_user_id');
      
      // Remove columns
      const fieldsToRemove = [
        'paymentIntentId',
        'total',
        'checkoutSessionId', 
        'paymentStatus',
        'completedAt',
        'lastActivityAt',
        'checkoutSessionExpired'
      ];
      
      for (const fieldName of fieldsToRemove) {
        await queryInterface.removeColumn('shopping_carts', fieldName);
      }
      
      console.log('✅ Payment fields removed from shopping_carts table');
      
    } catch (error) {
      console.error('❌ Error removing payment fields:', error.message);
      throw error;
    }
  }
};
