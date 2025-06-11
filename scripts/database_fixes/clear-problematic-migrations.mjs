/**
 * CLEAR PROBLEMATIC MIGRATIONS
 * ============================
 * 
 * This script removes problematic migrations from SequelizeMeta table
 * so they don't keep blocking the UUID conversion fix.
 */

import sequelize from './backend/database.mjs';

async function clearProblematicMigrations() {
  console.log('🧹 CLEARING PROBLEMATIC MIGRATIONS');
  console.log('===================================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check what migrations are currently marked as run
    console.log('📋 Current migrations in SequelizeMeta:');
    const currentMigrations = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    currentMigrations.forEach(m => console.log(`  - ${m.name}`));
    console.log(`\nTotal: ${currentMigrations.length} migrations\n`);

    // Remove problematic migrations that are causing the UUID issue
    const problematicMigrations = [
      '20250528000002-fix-uuid-foreign-keys.cjs',
      '20250528000003-emergency-uuid-fix.cjs',
      '20250528000004-ultimate-uuid-fix.cjs',
      '20250528000005-definitive-uuid-fix.cjs',
      '20250528000006-emergency-bypass-fix.cjs',
      '20250528000007-final-integer-alignment-fix.cjs'
    ];

    console.log('🗑️ Removing problematic migrations from SequelizeMeta...');
    
    for (const migration of problematicMigrations) {
      try {
        const result = await sequelize.query(
          'DELETE FROM "SequelizeMeta" WHERE name = ?',
          {
            replacements: [migration],
            type: sequelize.QueryTypes.DELETE
          }
        );
        console.log(`  ✅ Removed: ${migration}`);
      } catch (error) {
        console.log(`  ⚠️ Could not remove ${migration}: ${error.message}`);
      }
    }

    console.log('\n📋 Updated migrations in SequelizeMeta:');
    const updatedMigrations = await sequelize.query(
      'SELECT name FROM "SequelizeMeta" ORDER BY name',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    updatedMigrations.forEach(m => console.log(`  - ${m.name}`));
    console.log(`\nTotal: ${updatedMigrations.length} migrations\n`);

    console.log('🎉 MIGRATION CLEANUP COMPLETED!');
    console.log('✅ Problematic migrations removed');
    console.log('✅ Migration state cleaned up');
    console.log('\n🚀 Ready to run targeted UUID fix!');

  } catch (error) {
    console.error('❌ Error cleaning migrations:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

clearProblematicMigrations();