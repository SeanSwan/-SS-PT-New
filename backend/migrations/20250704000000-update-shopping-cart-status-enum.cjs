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
      // Check if enum already has the new values
      const [existingValues] = await queryInterface.sequelize.query(`
        SELECT enumlabel
        FROM pg_enum
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
        WHERE pg_type.typname = 'enum_shopping_carts_status'
        ORDER BY enumsortorder;
      `);

      const currentValues = existingValues.map(row => row.enumlabel);
      const hasAllValues = ['active', 'pending_payment', 'completed', 'cancelled']
        .every(val => currentValues.includes(val));

      if (hasAllValues) {
        console.log('✅ Enum already has all required values - skipping migration');
        return;
      }

      // Drop the default first (if varchar)
      await queryInterface.sequelize.query(`
        ALTER TABLE shopping_carts ALTER COLUMN status DROP DEFAULT;
      `).catch(() => {
        // Default may not exist or already dropped
      });

      // Check if new type already exists, if not create it
      const [newTypeExists] = await queryInterface.sequelize.query(`
        SELECT typname FROM pg_type WHERE typname = 'enum_shopping_carts_status_new';
      `);

      if (newTypeExists.length === 0) {
        await queryInterface.sequelize.query(`
          CREATE TYPE enum_shopping_carts_status_new AS ENUM (
            'active',
            'pending_payment',
            'completed',
            'cancelled'
          );
        `);
      }

      // Alter the column to use the new enum type
      await queryInterface.sequelize.query(`
        ALTER TABLE shopping_carts
        ALTER COLUMN status TYPE enum_shopping_carts_status_new
        USING status::text::enum_shopping_carts_status_new;
      `);

      // Drop the old enum type and rename the new one
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS enum_shopping_carts_status;
        ALTER TYPE enum_shopping_carts_status_new RENAME TO enum_shopping_carts_status;
      `);

      // Restore default
      await queryInterface.sequelize.query(`
        ALTER TABLE shopping_carts
        ALTER COLUMN status SET DEFAULT 'active'::enum_shopping_carts_status;
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
