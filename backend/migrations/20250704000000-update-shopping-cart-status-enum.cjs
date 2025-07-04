'use strict';

/**
 * Migration: Update ShoppingCart Status Enum
 * 
 * Expands the shopping_carts status enum to support payment processing states:
 * - 'active' - Cart being built by user
 * - 'pending_payment' - Payment in progress (Stripe or manual)  
 * - 'completed' - Order completed and paid
 * - 'cancelled' - Payment cancelled or expired
 * 
 * This fixes the constraint violation error in ManualPaymentStrategy
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Updating shopping_carts status enum to support payment states...');
    
    try {
      // PostgreSQL: Update enum type by creating new type and altering column
      await queryInterface.sequelize.query(`
        -- Create new enum type with all required status values
        CREATE TYPE enum_shopping_carts_status_new AS ENUM (
          'active', 
          'pending_payment', 
          'completed', 
          'cancelled'
        );
      `);

      // Alter the column to use the new enum type
      await queryInterface.sequelize.query(`
        -- Update the status column to use new enum
        ALTER TABLE shopping_carts 
        ALTER COLUMN status TYPE enum_shopping_carts_status_new 
        USING status::text::enum_shopping_carts_status_new;
      `);

      // Drop the old enum type and rename the new one
      await queryInterface.sequelize.query(`
        -- Clean up: drop old enum and rename new one
        DROP TYPE enum_shopping_carts_status;
        ALTER TYPE enum_shopping_carts_status_new RENAME TO enum_shopping_carts_status;
      `);

      console.log('✅ Shopping cart status enum updated successfully!');
      console.log('   Status values now supported:');
      console.log('   - active (default)');
      console.log('   - pending_payment');  
      console.log('   - completed');
      console.log('   - cancelled');

    } catch (error) {
      console.error('❌ Error updating status enum:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting shopping_carts status enum to original values...');
    
    try {
      // Revert any non-original status values to 'active' before changing enum
      await queryInterface.sequelize.query(`
        UPDATE shopping_carts 
        SET status = 'active' 
        WHERE status NOT IN ('active', 'completed');
      `);

      // Create original enum type
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_shopping_carts_status_original AS ENUM ('active', 'completed');
      `);

      // Alter column back to original enum
      await queryInterface.sequelize.query(`
        ALTER TABLE shopping_carts 
        ALTER COLUMN status TYPE enum_shopping_carts_status_original 
        USING status::text::enum_shopping_carts_status_original;
      `);

      // Clean up enum types
      await queryInterface.sequelize.query(`
        DROP TYPE enum_shopping_carts_status;
        ALTER TYPE enum_shopping_carts_status_original RENAME TO enum_shopping_carts_status;
      `);

      console.log('✅ Shopping cart status enum reverted to original values');

    } catch (error) {
      console.error('❌ Error reverting status enum:', error.message);
      throw error;
    }
  }
};
