/**
 * Add Missing Stripe Columns to Storefront Items
 * ===============================================
 *
 * Purpose: Fix schema mismatch causing 500 errors in Video Library endpoints
 *
 * Root Cause: Original migration (20250213192601) defined these columns but never added them
 *
 * Solution: Forward-only migration to add missing columns (DO NOT edit original migration)
 *
 * Consensus: Approved by Kilo, Roo, Gemini (2025-11-18)
 *
 * Blueprint Reference: docs/ai-workflow/STOREFRONT-SCHEMA-FIX-CONSENSUS-PLAN.md
 *
 * Enhancements:
 * - Kilo: Added indexes for performance
 * - Roo: Forward-only migration pattern (never edit old migrations)
 * - Gemini: Verified frontend impact prevention
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔧 Adding missing Stripe columns to storefront_items...');

      // Check if table exists
      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('storefront_items')) {
        throw new Error('Table storefront_items does not exist - run base migration first');
      }

      // Check if columns already exist (idempotency)
      const tableDescription = await queryInterface.describeTable('storefront_items', { transaction });

      // Add stripeProductId if missing
      if (!tableDescription.stripeProductId) {
        await queryInterface.addColumn(
          'storefront_items',
          'stripeProductId',
          {
            type: Sequelize.STRING(255),
            allowNull: true,
            comment: 'Stripe Product ID for payment integration'
          },
          { transaction }
        );
        console.log('   ✅ Added column: stripeProductId');
      } else {
        console.log('   ⏭️  Column stripeProductId already exists');
      }

      // Add stripePriceId if missing
      if (!tableDescription.stripePriceId) {
        await queryInterface.addColumn(
          'storefront_items',
          'stripePriceId',
          {
            type: Sequelize.STRING(255),
            allowNull: true,
            comment: 'Stripe Price ID for payment integration'
          },
          { transaction }
        );
        console.log('   ✅ Added column: stripePriceId');
      } else {
        console.log('   ⏭️  Column stripePriceId already exists');
      }

      // ENHANCEMENT (Kilo): Add indexes for performance
      console.log('   📊 Adding indexes for Stripe columns...');

      try {
        await queryInterface.addIndex(
          'storefront_items',
          ['stripeProductId'],
          {
            name: 'storefront_items_stripe_product_idx',
            transaction
          }
        );
        console.log('   ✅ Created index: storefront_items_stripe_product_idx');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('   ⏭️  Index storefront_items_stripe_product_idx already exists');
        } else {
          throw err;
        }
      }

      try {
        await queryInterface.addIndex(
          'storefront_items',
          ['stripePriceId'],
          {
            name: 'storefront_items_stripe_price_idx',
            transaction
          }
        );
        console.log('   ✅ Created index: storefront_items_stripe_price_idx');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('   ⏭️  Index storefront_items_stripe_price_idx already exists');
        } else {
          throw err;
        }
      }

      await transaction.commit();
      console.log('✅ Migration completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('⏪ Reverting: Removing Stripe columns from storefront_items...');

      // Remove indexes first
      try {
        await queryInterface.removeIndex(
          'storefront_items',
          'storefront_items_stripe_product_idx',
          { transaction }
        );
        console.log('   ✅ Removed index: storefront_items_stripe_product_idx');
      } catch (err) {
        console.log('   ⚠️  Index may not exist, continuing...');
      }

      try {
        await queryInterface.removeIndex(
          'storefront_items',
          'storefront_items_stripe_price_idx',
          { transaction }
        );
        console.log('   ✅ Removed index: storefront_items_stripe_price_idx');
      } catch (err) {
        console.log('   ⚠️  Index may not exist, continuing...');
      }

      // Remove columns
      await queryInterface.removeColumn('storefront_items', 'stripePriceId', { transaction });
      console.log('   ✅ Removed column: stripePriceId');

      await queryInterface.removeColumn('storefront_items', 'stripeProductId', { transaction });
      console.log('   ✅ Removed column: stripeProductId');

      await transaction.commit();
      console.log('✅ Rollback completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
