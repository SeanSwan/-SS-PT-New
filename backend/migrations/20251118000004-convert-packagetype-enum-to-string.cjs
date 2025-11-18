/**
 * Convert Storefront packageType from ENUM to STRING
 * ===================================================
 *
 * Purpose: Phase 2 of storefront schema fix - migrate from rigid ENUM to flexible STRING
 *
 * Root Cause: packageType is currently an ENUM which prevents adding 'custom' package type
 *
 * Solution: Convert packageType from ENUM to VARCHAR(50) with CHECK constraint
 *
 * Benefits:
 * - Support 'custom' packages for personal training flexibility
 * - Allow future package types without schema migrations
 * - Maintain data validation through CHECK constraint
 * - Preserve existing data during conversion
 *
 * Consensus: Approved by Kilo, Roo, and Gemini (2025-11-18)
 *
 * Blueprint Reference: docs/ai-workflow/STOREFRONT-SCHEMA-FIX-CONSENSUS-PLAN.md
 *
 * Technical Approach:
 * 1. Create temporary column (packageType_new VARCHAR(50))
 * 2. Copy data from ENUM to new column (cast to text)
 * 3. Drop old ENUM column
 * 4. Rename new column to packageType
 * 5. Add NOT NULL constraint
 * 6. Add CHECK constraint for validation
 * 7. Add index for performance
 * 8. Drop orphaned ENUM type
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔧 Phase 2: Converting packageType from ENUM to STRING...');

      // Check if table exists
      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('storefront_items')) {
        throw new Error('Table storefront_items does not exist - run base migration first');
      }

      const tableDescription = await queryInterface.describeTable('storefront_items', { transaction });

      // STEP 1: Create temporary column
      console.log('   📝 Step 1: Creating temporary column packageType_new...');
      if (!tableDescription.packageType_new) {
        await queryInterface.addColumn(
          'storefront_items',
          'packageType_new',
          {
            type: Sequelize.STRING(50),
            allowNull: true,
            comment: 'Temporary column for ENUM to STRING migration'
          },
          { transaction }
        );
        console.log('   ✅ Created temporary column: packageType_new');
      } else {
        console.log('   ⏭️  Column packageType_new already exists');
      }

      // STEP 2: Copy data from old ENUM column to new STRING column
      console.log('   📋 Step 2: Copying data from packageType to packageType_new...');
      await queryInterface.sequelize.query(
        `UPDATE storefront_items SET "packageType_new" = "packageType"::text WHERE "packageType_new" IS NULL`,
        { transaction }
      );
      console.log('   ✅ Data copied successfully');

      // STEP 3: Drop old ENUM column
      console.log('   🗑️  Step 3: Dropping old ENUM column...');
      if (tableDescription.packageType) {
        await queryInterface.removeColumn('storefront_items', 'packageType', { transaction });
        console.log('   ✅ Dropped old column: packageType');
      } else {
        console.log('   ⏭️  Column packageType already dropped');
      }

      // STEP 4: Rename new column to packageType
      console.log('   🔄 Step 4: Renaming packageType_new to packageType...');
      await queryInterface.renameColumn('storefront_items', 'packageType_new', 'packageType', { transaction });
      console.log('   ✅ Renamed column: packageType_new → packageType');

      // STEP 5: Add NOT NULL constraint (after rename, so we have data)
      console.log('   🔒 Step 5: Adding NOT NULL constraint...');
      await queryInterface.sequelize.query(
        `ALTER TABLE storefront_items ALTER COLUMN "packageType" SET NOT NULL`,
        { transaction }
      );
      console.log('   ✅ Added NOT NULL constraint');

      // STEP 6: Add CHECK constraint for validation
      console.log('   ✅ Step 6: Adding CHECK constraint...');
      try {
        await queryInterface.sequelize.query(
          `ALTER TABLE storefront_items
           ADD CONSTRAINT storefront_items_packagetype_check
           CHECK ("packageType" IN ('fixed', 'monthly', 'custom'))`,
          { transaction }
        );
        console.log('   ✅ Added CHECK constraint: fixed, monthly, custom');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('   ⏭️  CHECK constraint already exists');
        } else {
          throw err;
        }
      }

      // STEP 7: Add index for performance (Kilo's enhancement)
      console.log('   📊 Step 7: Verifying performance index...');
      const indexes = await queryInterface.sequelize.query(
        `SELECT indexname FROM pg_indexes
         WHERE tablename = 'storefront_items'
         AND (indexname LIKE '%packagetype%' OR indexname LIKE '%packageType%')`,
        { transaction, type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      if (indexes.length > 0) {
        console.log(`   ⏭️  Index already exists: ${indexes[0].indexname}`);
      } else {
        try {
          await queryInterface.addIndex(
            'storefront_items',
            ['packageType'],
            {
              name: 'storefront_items_packagetype_idx',
              transaction
            }
          );
          console.log('   ✅ Created index: storefront_items_packagetype_idx');
        } catch (err) {
          if (err.message.includes('already exists')) {
            console.log('   ⏭️  Index already exists');
          } else {
            throw err;
          }
        }
      }

      // STEP 8: Drop orphaned ENUM type (safe to do after column is converted)
      console.log('   🗑️  Step 8: Dropping orphaned ENUM type...');
      try {
        await queryInterface.sequelize.query(
          `DROP TYPE IF EXISTS "enum_storefront_items_packageType"`,
          { transaction }
        );
        console.log('   ✅ Dropped ENUM type: enum_storefront_items_packageType');
      } catch (err) {
        console.log('   ⏭️  ENUM type may not exist or already dropped');
      }

      await transaction.commit();
      console.log('✅ Phase 2 migration completed successfully');
      console.log('   🎉 packageType is now VARCHAR(50) with CHECK constraint');
      console.log('   🎉 Supports: fixed, monthly, custom');
      console.log('   🎉 Ready for personal training custom packages!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Phase 2 migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('⏪ Reverting Phase 2: Converting packageType back to ENUM...');

      // Remove index
      try {
        await queryInterface.removeIndex(
          'storefront_items',
          'storefront_items_packagetype_idx',
          { transaction }
        );
        console.log('   ✅ Removed index: storefront_items_packagetype_idx');
      } catch (err) {
        console.log('   ⚠️  Index may not exist, continuing...');
      }

      // Remove CHECK constraint
      try {
        await queryInterface.sequelize.query(
          `ALTER TABLE storefront_items DROP CONSTRAINT IF EXISTS storefront_items_packagetype_check`,
          { transaction }
        );
        console.log('   ✅ Removed CHECK constraint');
      } catch (err) {
        console.log('   ⚠️  CHECK constraint may not exist, continuing...');
      }

      // Create ENUM type
      console.log('   📝 Creating ENUM type...');
      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_storefront_items_packageType" AS ENUM ('fixed', 'monthly')`,
        { transaction }
      );

      // Create temporary column with ENUM type
      console.log('   📝 Creating temporary ENUM column...');
      await queryInterface.addColumn(
        'storefront_items',
        'packageType_enum',
        {
          type: Sequelize.ENUM('fixed', 'monthly'),
          allowNull: true
        },
        { transaction }
      );

      // Copy data (excluding 'custom' values which won't fit in old ENUM)
      console.log('   📋 Copying data to ENUM column (excluding custom values)...');
      await queryInterface.sequelize.query(
        `UPDATE storefront_items
         SET "packageType_enum" = "packageType"::"enum_storefront_items_packageType"
         WHERE "packageType" IN ('fixed', 'monthly')`,
        { transaction }
      );

      // Drop STRING column
      await queryInterface.removeColumn('storefront_items', 'packageType', { transaction });
      console.log('   ✅ Dropped STRING column');

      // Rename ENUM column back
      await queryInterface.renameColumn('storefront_items', 'packageType_enum', 'packageType', { transaction });
      console.log('   ✅ Renamed column back to packageType');

      // Add NOT NULL constraint
      await queryInterface.sequelize.query(
        `ALTER TABLE storefront_items ALTER COLUMN "packageType" SET NOT NULL`,
        { transaction }
      );

      await transaction.commit();
      console.log('✅ Rollback completed successfully');
      console.log('   ⚠️  WARNING: Any "custom" package types were lost during rollback');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};
