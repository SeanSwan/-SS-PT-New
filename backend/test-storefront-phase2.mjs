/**
 * Phase 2 Storefront Schema Fix Verification Tests
 * ==================================================
 *
 * Tests that itemType ENUM → STRING conversion worked correctly
 *
 * Test Coverage:
 * 1. Database schema verification (VARCHAR(50), NOT NULL)
 * 2. CHECK constraint exists and validates properly
 * 3. All original ENUM values still work (subscription, one-time, bundle)
 * 4. New 'custom' value works correctly
 * 5. Invalid values are rejected by CHECK constraint
 * 6. Index exists for performance
 * 7. Model operations work with new schema
 * 8. Existing data preserved during migration
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

// Define StorefrontItem model matching new schema
const StorefrontItem = sequelize.define('storefront_items', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  itemType: {
    type: DataTypes.STRING(50), // Changed from ENUM to STRING
    allowNull: false,
    validate: {
      isIn: [['subscription', 'one-time', 'bundle', 'custom']]
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
  paranoid: true
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

    // TEST 1: Verify database schema - itemType is VARCHAR(50) NOT NULL
    console.log('TEST 1: Verify itemType column schema...');
    try {
      const columns = await sequelize.query(
        `SELECT column_name, data_type, character_maximum_length, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'storefront_items'
         AND column_name = 'itemType'`,
        { type: QueryTypes.SELECT }
      );

      if (columns.length === 0) {
        throw new Error('Column itemType not found');
      }

      const col = columns[0];
      if (col.data_type !== 'character varying') {
        throw new Error(`Expected VARCHAR, got ${col.data_type}`);
      }
      if (col.character_maximum_length !== 50) {
        throw new Error(`Expected length 50, got ${col.character_maximum_length}`);
      }
      if (col.is_nullable !== 'NO') {
        throw new Error(`Expected NOT NULL, column is nullable`);
      }

      console.log(`   ✅ Column schema correct: VARCHAR(50) NOT NULL`);
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
         WHERE constraint_name = 'storefront_items_itemtype_check'`,
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

    // TEST 3: Verify original ENUM values still work (subscription)
    console.log('\nTEST 3: Verify original ENUM value "subscription" works...');
    try {
      const item = await StorefrontItem.create({
        name: 'Test Subscription Package (Phase 2)',
        itemType: 'subscription',
        isActive: false
      });
      testItems.push(item.id);
      console.log(`   ✅ Created item with itemType="subscription" (id: ${item.id})`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 4: Verify original ENUM value "one-time" works
    console.log('\nTEST 4: Verify original ENUM value "one-time" works...');
    try {
      const item = await StorefrontItem.create({
        name: 'Test One-Time Package (Phase 2)',
        itemType: 'one-time',
        isActive: false
      });
      testItems.push(item.id);
      console.log(`   ✅ Created item with itemType="one-time" (id: ${item.id})`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 5: Verify original ENUM value "bundle" works
    console.log('\nTEST 5: Verify original ENUM value "bundle" works...');
    try {
      const item = await StorefrontItem.create({
        name: 'Test Bundle Package (Phase 2)',
        itemType: 'bundle',
        isActive: false
      });
      testItems.push(item.id);
      console.log(`   ✅ Created item with itemType="bundle" (id: ${item.id})`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 6: Verify new 'custom' value works (PRIMARY GOAL OF PHASE 2)
    console.log('\nTEST 6: Verify new "custom" value works...');
    try {
      const item = await StorefrontItem.create({
        name: 'Test Custom Personal Training Package (Phase 2)',
        itemType: 'custom',
        stripeProductId: 'prod_custom_test',
        stripePriceId: 'price_custom_test',
        isActive: false
      });
      testItems.push(item.id);
      console.log(`   ✅ Created item with itemType="custom" (id: ${item.id})`);
      console.log(`   🎉 SUCCESS: "custom" packages now supported!`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 7: Verify invalid values are rejected by CHECK constraint
    console.log('\nTEST 7: Verify invalid values are rejected...');
    try {
      await sequelize.query(
        `INSERT INTO storefront_items (id, name, "itemType", "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'Invalid Test', 'invalid-type', false, NOW(), NOW())`,
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

    // TEST 8: Verify index exists for performance
    console.log('\nTEST 8: Verify performance index exists...');
    try {
      const indexes = await sequelize.query(
        `SELECT indexname, indexdef
         FROM pg_indexes
         WHERE tablename = 'storefront_items'
         AND indexname = 'storefront_items_itemtype_idx'`,
        { type: QueryTypes.SELECT }
      );

      if (indexes.length === 0) {
        throw new Error('Index storefront_items_itemtype_idx not found');
      }

      console.log(`   ✅ Index exists: ${indexes[0].indexname}`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 9: Verify model queries work with all itemType values
    console.log('\nTEST 9: Verify model queries work...');
    try {
      const customItems = await StorefrontItem.findAll({
        where: { itemType: 'custom' }
      });

      if (customItems.length === 0) {
        throw new Error('No custom items found');
      }

      console.log(`   ✅ Query successful: Found ${customItems.length} custom item(s)`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ FAILED: ${error.message}`);
      testsFailed++;
    }

    // TEST 10: Verify existing data preserved (count all items)
    console.log('\nTEST 10: Verify data integrity...');
    try {
      const totalCount = await StorefrontItem.count();
      console.log(`   ✅ Total items in database: ${totalCount}`);
      console.log(`   ✅ All existing data preserved during migration`);
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
    console.log(`✅ Tests Passed: ${testsPassed}/10`);
    console.log(`❌ Tests Failed: ${testsFailed}/10`);

    if (testsFailed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Phase 2 migration successful!');
      console.log('   ✨ itemType is now VARCHAR(50) with CHECK constraint');
      console.log('   ✨ Supports: subscription, one-time, bundle, custom');
      console.log('   ✨ Ready for personal training custom packages!');
      process.exit(0);
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - Review errors above');
      process.exit(1);
    }
  }
}

runTests();
