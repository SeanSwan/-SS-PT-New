/**
 * Migration: Add stripeCustomerId to Users table
 * ==============================================
 * CRITICAL P0 FIX: Adds missing stripeCustomerId column to Users table
 * 
 * This column is required for Stripe webhook integration and payment processing.
 * Missing column was causing v2PaymentRoutes to fail with 500 errors.
 * 
 * Production deployment: SAFE - Column is nullable, no data migration needed
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if column already exists to prevent duplicate column errors
      const tableDescription = await queryInterface.describeTable('Users');
      
      if (!tableDescription.stripeCustomerId) {
        console.log('Adding stripeCustomerId column to Users table...');
        
        await queryInterface.addColumn('Users', 'stripeCustomerId', {
          type: Sequelize.STRING,
          allowNull: true,
          comment: 'Stripe customer ID for payment processing and subscription management'
        });
        
        console.log('✅ stripeCustomerId column added successfully');
      } else {
        console.log('⚠️ stripeCustomerId column already exists, skipping...');
      }
      
    } catch (error) {
      console.error('❌ Error adding stripeCustomerId column:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Check if column exists before attempting to remove it
      const tableDescription = await queryInterface.describeTable('Users');
      
      if (tableDescription.stripeCustomerId) {
        console.log('Removing stripeCustomerId column from Users table...');
        
        await queryInterface.removeColumn('Users', 'stripeCustomerId');
        
        console.log('✅ stripeCustomerId column removed successfully');
      } else {
        console.log('⚠️ stripeCustomerId column does not exist, skipping...');
      }
      
    } catch (error) {
      console.error('❌ Error removing stripeCustomerId column:', error.message);
      throw error;
    }
  }
};
