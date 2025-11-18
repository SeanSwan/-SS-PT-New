/**
 * Phase 2 Storefront Schema Fix Verification Tests
 * ==================================================
 *
 * Tests that packageType CHECK constraint was added correctly
 *
 * DISCOVERY: packageType was already STRING type (not ENUM) - no conversion needed!
 *
 * Test Coverage:
 * 1. Verify packageType column exists and is STRING type
 * 2. CHECK constraint exists and validates properly
 * 3. All original values still work (fixed, monthly)
 * 4. New 'custom' value works correctly (PRIMARY GOAL)
 * 5. Invalid values are rejected by CHECK constraint
 * 6. Index exists for performance
 */

import { Sequelize, DataTypes, QueryTypes } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'swanstudios',
  process.env.DB_USER || 'swanadmin',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

// Define StorefrontItem model matching actual schema
const StorefrontItem = sequelize.define('storefront_items', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  packageType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['fixed', 'monthly', 'custom']]
    }
  },
  stripeProductId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  stripePriceId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'storefront_items',
  timestamps: true,
  paranoid: false
});

async function runTests() {
  console.log('🧪 PHASE 2 STOREFRONT SCHEMA FIX VERIFICATION');
  console.log('==============================================\n');

  let testsPassed = 0;
  let testsFailed = 0;
  const testItems = [];

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // TEST 1: Verify packageType column exists
    console.log('TEST 1: Verify packageType column exists...');
    try {
      const columns = await sequelize.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'storefront_items'
         AND column_name = 'packageType'`,
        { type: QueryTypes.SELECT }
      );

      if (columns.length === 0) {
        throw new Error('Column packageType not found');
      }

      console.log(`   ✅ Column packageType exists: ${columns[0].data_type}`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 2: Verify CHECK constraint exists
    console.log('\nTEST 2: Verify CHECK constraint exists...');
    try {
      const constraints = await sequelize.query(
        `SELECT constraint_name, check_clause
         FROM information_schema.check_constraints
         WHERE constraint_name = 'storefront_items_packagetype_check'`,
        { type: QueryTypes.SELECT }
      );

      if (constraints.length === 0) {
        throw new Error('CHECK constraint not found');
      }

      console.log(`   ✅ CHECK constraint exists: ${constraints[0].constraint_name}`);
      console.log(`   📋 Validation: ${constraints[0].check_clause}`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 3: Verify 'fixed' value works
    console.log('\nTEST 3: Verify original value "fixed" works...');
    try {
      const item = await StorefrontItem.create({
        name: 'Test Fixed Package (Phase 2)',
        packageType: 'fixed',
        pricePerSession: 50.00,
        isActive: false
      });
      testItems.push(item.id);
      console.log(`   ✅ Created item with packageType="fixed" (id: ${item.id})`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 4: Verify 'monthly' value works
    console.log('\nTEST 4: Verify original value "monthly" works...');
    try {
      const item = await StorefrontItem.create({
        name: 'Test Monthly Package (Phase 2)',
        packageType: 'monthly',
        pricePerSession: 45.00,
        isActive: false
      });
      testItems.push(item.id);
      console.log(`   ✅ Created item with packageType="monthly" (id: ${item.id})`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 5: Verify new 'custom' value works (PRIMARY GOAL OF PHASE 2)
    console.log('\nTEST 5: Verify new "custom" value works...');
    try {
      const item = await StorefrontItem.create({
        name: 'Test Custom Personal Training Package (Phase 2)',
        packageType: 'custom',
        pricePerSession: 60.00,
        stripeProductId: 'prod_custom_test',
        stripePriceId: 'price_custom_test',
        isActive: false
      });
      testItems.push(item.id);
      console.log(`   ✅ Created item with packageType="custom" (id: ${item.id})`);
      console.log(`   🎉 SUCCESS: "custom" packages now supported!`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 6: Verify invalid values are rejected by CHECK constraint
    console.log('\nTEST 6: Verify invalid values are rejected...');
    try {
      await sequelize.query(
        `INSERT INTO storefront_items (name, "packageType", "pricePerSession", "isActive", "createdAt", "updatedAt")
         VALUES ('Invalid Test', 'invalid-type', 50.00, false, NOW(), NOW())`,
        { type: QueryTypes.INSERT }
      );
      console.error(`   ❌ FAILED: Invalid value was accepted (CHECK constraint not working)`);
      testsFailed++;
    } catch (error) {
      if (error.message.includes('check constraint') || error.message.includes('violates check')) {
        console.log(`   ✅ Invalid value correctly rejected by CHECK constraint`);
        testsPassed++;
      } else {
        console.error(`   ❌ FAILED: Unexpected error: ${error.message}`);
        testsFailed++;
      }
    }

    // TEST 7: Verify index exists for performance
    console.log('\nTEST 7: Verify performance index exists...');
    try {
      const indexes = await sequelize.query(
        `SELECT indexname
         FROM pg_indexes
         WHERE tablename = 'storefront_items'
         AND (indexname LIKE '%packagetype%' OR indexname LIKE '%packageType%')`,
        { type: QueryTypes.SELECT }
      );

      if (indexes.length === 0) {
        throw new Error('No packageType index found');
      }

      console.log(`   ✅ Index exists: ${indexes[0].indexname}`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error.message);
  } finally {
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    for (const itemId of testItems) {
      try {
        await StorefrontItem.destroy({ where: { id: itemId }, force: true });
        console.log(`   ✅ Deleted test item: ${itemId}`);
      } catch (error) {
        console.error(`   ⚠️  Failed to delete ${itemId}: ${error.message}`);
      }
    }

    await sequelize.close();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Tests Passed: ${testsPassed}/7`);
    console.log(`❌ Tests Failed: ${testsFailed}/7`);

    if (testsFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Phase 2 migration successful!');
      console.log('   ✨ packageType now has CHECK constraint validation');
      console.log('   ✨ Supports: fixed, monthly, custom');
      console.log('   ✨ Ready for personal training custom packages!');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - Review errors above');
      process.exit(1);
    }
  }
}

runTests();
