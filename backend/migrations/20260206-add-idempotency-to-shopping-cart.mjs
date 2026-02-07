/**
 * Migration: Add idempotency and tracking columns to shopping_carts table
 *
 * This migration adds columns needed for:
 * - Idempotency: Prevent double session grants from webhook + verify-session
 * - Audit trail: Track Stripe session data and customer info
 * - Order breakdown: Store subtotal, tax, and checkout timestamps
 *
 * Run: npx sequelize-cli db:migrate
 * Or manually with: node backend/migrations/20260206-add-idempotency-to-shopping-cart.mjs
 */

import sequelize from '../database.mjs';

async function runMigration() {
  console.log('🔄 Running migration: Add idempotency columns to shopping_carts');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check which columns already exist
    const [columns] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'shopping_carts'
      AND table_schema = current_schema()
    `);

    const existingColumns = columns.map(c => c.column_name);
    console.log('📋 Existing columns:', existingColumns.length);

    // Add sessionsGranted if it doesn't exist
    if (!existingColumns.includes('sessionsGranted')) {
      await sequelize.query(`
        ALTER TABLE shopping_carts
        ADD COLUMN "sessionsGranted" BOOLEAN DEFAULT false NOT NULL
      `);
      console.log('✅ Added: sessionsGranted');
    } else {
      console.log('⏭️  Skipped: sessionsGranted (already exists)');
    }

    // Add stripeSessionData if it doesn't exist
    if (!existingColumns.includes('stripeSessionData')) {
      await sequelize.query(`
        ALTER TABLE shopping_carts
        ADD COLUMN "stripeSessionData" TEXT
      `);
      console.log('✅ Added: stripeSessionData');
    } else {
      console.log('⏭️  Skipped: stripeSessionData (already exists)');
    }

    // Add customerInfo if it doesn't exist
    if (!existingColumns.includes('customerInfo')) {
      await sequelize.query(`
        ALTER TABLE shopping_carts
        ADD COLUMN "customerInfo" TEXT
      `);
      console.log('✅ Added: customerInfo');
    } else {
      console.log('⏭️  Skipped: customerInfo (already exists)');
    }

    // Add subtotal if it doesn't exist
    if (!existingColumns.includes('subtotal')) {
      await sequelize.query(`
        ALTER TABLE shopping_carts
        ADD COLUMN "subtotal" DECIMAL(10, 2)
      `);
      console.log('✅ Added: subtotal');
    } else {
      console.log('⏭️  Skipped: subtotal (already exists)');
    }

    // Add tax if it doesn't exist
    if (!existingColumns.includes('tax')) {
      await sequelize.query(`
        ALTER TABLE shopping_carts
        ADD COLUMN "tax" DECIMAL(10, 2)
      `);
      console.log('✅ Added: tax');
    } else {
      console.log('⏭️  Skipped: tax (already exists)');
    }

    // Add lastCheckoutAttempt if it doesn't exist
    if (!existingColumns.includes('lastCheckoutAttempt')) {
      await sequelize.query(`
        ALTER TABLE shopping_carts
        ADD COLUMN "lastCheckoutAttempt" TIMESTAMP
      `);
      console.log('✅ Added: lastCheckoutAttempt');
    } else {
      console.log('⏭️  Skipped: lastCheckoutAttempt (already exists)');
    }

    console.log('\n🎉 Migration complete: shopping_carts idempotency columns added');
    console.log('');
    console.log('New columns:');
    console.log('  - sessionsGranted: BOOLEAN (prevents double session grants)');
    console.log('  - stripeSessionData: TEXT (JSON audit trail)');
    console.log('  - customerInfo: TEXT (JSON customer data)');
    console.log('  - subtotal: DECIMAL (order breakdown)');
    console.log('  - tax: DECIMAL (order breakdown)');
    console.log('  - lastCheckoutAttempt: TIMESTAMP (checkout tracking)');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('20260206')) {
  runMigration();
}

export default runMigration;
