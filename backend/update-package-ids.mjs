/**
 * Update Package IDs to Match Frontend Expectations
 * ==================================================
 * This script updates storefront_items IDs from current values to 50-57
 * to match the frontend fallback data expectations.
 *
 * CRITICAL: This fixes the 404 "Training package not found" error
 *
 * Before running:
 * 1. Backup database: pg_dump swanstudios > backup_before_id_update.sql
 * 2. Verify current IDs: node verify-package-ids.mjs
 */

import sequelize from './database.mjs';

async function updatePackageIDs() {
  const transaction = await sequelize.transaction();

  try {
    console.log('\n🔧 UPDATING PACKAGE IDs TO MATCH FRONTEND EXPECTATIONS');
    console.log('='.repeat(80));

    await sequelize.authenticate();

    // Step 1: Get current packages ordered by displayOrder
    console.log('\n📋 Step 1: Fetching current packages...');
    const [packages] = await sequelize.query(`
      SELECT id, name, "displayOrder"
      FROM storefront_items
      ORDER BY "displayOrder", id;
    `, { transaction });

    if (packages.length !== 8) {
      throw new Error(`Expected 8 packages, found ${packages.length}. Aborting.`);
    }

    console.log(`   Found ${packages.length} packages`);

    // Step 2: Create ID mapping
    console.log('\n📋 Step 2: Creating ID mapping...');
    const expectedNames = [
      'Silver Swan Wing',
      'Golden Swan Flight',
      'Sapphire Swan Soar',
      'Platinum Swan Grace',
      'Emerald Swan Evolution',
      'Diamond Swan Dynasty',
      'Ruby Swan Reign',
      'Rhodium Swan Royalty'
    ];

    const idMapping = packages.map((pkg, index) => ({
      oldId: pkg.id,
      newId: 50 + index,
      name: pkg.name,
      expectedName: expectedNames[index]
    }));

    console.log('\n   ID Mapping:');
    idMapping.forEach(m => {
      const match = m.name === m.expectedName ? '✅' : '⚠️';
      console.log(`   ${match} ${m.name}: ${m.oldId} → ${m.newId}`);
    });

    // Check if any IDs need updating
    const needsUpdate = idMapping.some(m => m.oldId !== m.newId);
    if (!needsUpdate) {
      console.log('\n✅ All package IDs already match frontend expectations (50-57)');
      console.log('   No updates needed!');
      await transaction.rollback();
      await sequelize.close();
      return;
    }

    // Step 3: Create temporary IDs to avoid conflicts
    console.log('\n📋 Step 3: Moving packages to temporary IDs...');
    for (let i = 0; i < idMapping.length; i++) {
      const tempId = 1000 + i; // Use 1000-1007 as temp IDs
      const mapping = idMapping[i];

      if (mapping.oldId !== mapping.newId) {
        await sequelize.query(
          `UPDATE storefront_items SET id = :tempId WHERE id = :oldId`,
          {
            replacements: { tempId, oldId: mapping.oldId },
            transaction
          }
        );
        console.log(`   Moved ${mapping.name}: ${mapping.oldId} → ${tempId} (temp)`);
      }
    }

    // Step 4: Update to final IDs
    console.log('\n📋 Step 4: Assigning final IDs (50-57)...');
    for (let i = 0; i < idMapping.length; i++) {
      const tempId = 1000 + i;
      const mapping = idMapping[i];

      if (mapping.oldId !== mapping.newId) {
        await sequelize.query(
          `UPDATE storefront_items SET id = :newId WHERE id = :tempId`,
          {
            replacements: { newId: mapping.newId, tempId },
            transaction
          }
        );
        console.log(`   ✅ ${mapping.name}: ${tempId} (temp) → ${mapping.newId}`);
      }
    }

    // Step 5: Update foreign key references in cart_items
    console.log('\n📋 Step 5: Updating cart_items foreign key references...');
    const [cartItemsCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM cart_items`,
      { transaction }
    );

    const count = parseInt(cartItemsCount[0].count);
    console.log(`   Found ${count} cart items to check`);

    if (count > 0) {
      // Update cart_items to reference new IDs
      for (const mapping of idMapping) {
        if (mapping.oldId !== mapping.newId) {
          await sequelize.query(
            `UPDATE cart_items SET "storefrontItemId" = :newId WHERE "storefrontItemId" = :oldId`,
            {
              replacements: { oldId: mapping.oldId, newId: mapping.newId },
              transaction
            }
          );
        }
      }
      console.log('   ✅ Cart items updated');
    } else {
      console.log('   ℹ️  No cart items to update');
    }

    // Step 6: Reset sequence to start from 58
    console.log('\n📋 Step 6: Resetting ID sequence...');
    await sequelize.query(
      `SELECT setval('storefront_items_id_seq', 57, true)`,
      { transaction }
    );
    console.log('   ✅ Next auto-generated ID will be 58');

    // Commit transaction
    await transaction.commit();

    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS: Package IDs updated to 50-57');
    console.log('='.repeat(80));

    // Verify the update
    console.log('\n📋 Verification:');
    const [verifyPackages] = await sequelize.query(`
      SELECT id, name FROM storefront_items ORDER BY id;
    `);

    verifyPackages.forEach(p => {
      console.log(`   ID ${p.id}: ${p.name}`);
    });

    console.log('\n✅ Database now matches frontend expectations!');
    console.log('   Users can now add packages to cart without 404 errors.\n');

    await sequelize.close();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\n🔄 Rolling back changes...');
    await transaction.rollback();
    console.log('   ✅ Rollback complete - no changes made');
    console.log('\n💡 TIP: Restore from backup if needed:');
    console.log('   psql swanstudios < backup_before_id_update.sql\n');
    process.exit(1);
  }
}

// Run the update
console.log('\n⚠️  WARNING: This script will update package IDs in the database');
console.log('   Make sure you have created a backup first!\n');
console.log('   Backup command: pg_dump swanstudios > backup_before_id_update.sql\n');
console.log('   Press Ctrl+C to abort, or the script will start in 5 seconds...\n');

// Wait 5 seconds before executing
setTimeout(() => {
  updatePackageIDs();
}, 5000);
