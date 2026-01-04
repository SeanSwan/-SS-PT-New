/**
 * Verify Package IDs - Critical Diagnostic
 * This script checks actual database IDs vs frontend expectations
 */

import sequelize from './database.mjs';

async function verifyPackageIDs() {
  try {
    console.log('\n🔍 CRITICAL: PACKAGE ID VERIFICATION');
    console.log('='.repeat(80));

    await sequelize.authenticate();

    // Get all packages with their IDs
    const [packages] = await sequelize.query(`
      SELECT id, name, sessions, "packageType", "isActive", "totalCost"
      FROM storefront_items
      ORDER BY "displayOrder", id;
    `);

    console.log(`\nTotal packages in database: ${packages.length}\n`);

    console.log('DATABASE PACKAGE IDs:');
    console.log('-'.repeat(80));
    packages.forEach((p, idx) => {
      console.log(`${idx + 1}. ID: ${p.id} | Name: ${p.name} | Sessions: ${p.sessions || 'custom'} | Active: ${p.isActive}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('FRONTEND EXPECTATIONS (from fallback data):');
    console.log('-'.repeat(80));
    const expectedIDs = [50, 51, 52, 53, 54, 55, 56, 57];
    expectedIDs.forEach((id, idx) => {
      console.log(`${idx + 1}. Expected ID: ${id}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('ID MISMATCH ANALYSIS:');
    console.log('-'.repeat(80));

    const actualIDs = packages.map(p => p.id);
    const missingIDs = expectedIDs.filter(id => !actualIDs.includes(id));
    const extraIDs = actualIDs.filter(id => !expectedIDs.includes(id));

    if (missingIDs.length > 0) {
      console.log(`❌ CRITICAL: Frontend expects IDs that don't exist in database:`);
      missingIDs.forEach(id => console.log(`   - ID ${id} is MISSING from database`));
    }

    if (extraIDs.length > 0) {
      console.log(`\n⚠️  WARNING: Database has IDs that frontend doesn't expect:`);
      extraIDs.forEach(id => {
        const pkg = packages.find(p => p.id === id);
        console.log(`   - ID ${id}: ${pkg.name}`);
      });
    }

    if (missingIDs.length === 0 && extraIDs.length === 0) {
      console.log('✅ PERFECT MATCH: All IDs align between frontend and database');
    } else {
      console.log('\n🔥 ROOT CAUSE IDENTIFIED:');
      console.log('   When user clicks "Add to Cart" with ID from frontend (e.g., 57),');
      console.log('   the backend looks for that ID in storefront_items table.');
      console.log('   If the ID doesn\'t exist, it returns 404 "Training package not found"');
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST: Simulate Add to Cart with ID 57');
    console.log('-'.repeat(80));

    const [testResult] = await sequelize.query(`
      SELECT id, name FROM storefront_items WHERE id = 57;
    `);

    if (testResult.length === 0) {
      console.log('❌ CONFIRMED: ID 57 does NOT exist in database');
      console.log('   This is why "Add to Cart" returns 404 error!');
    } else {
      console.log('✅ ID 57 exists:', testResult[0].name);
    }

    console.log('\n');
    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyPackageIDs();
