/**
 * Check Production Storefront Status
 * ===================================
 * Verifies if production database has storefront packages
 */

import sequelize from './database.mjs';

async function checkProductionStorefront() {
  try {
    console.log('🔍 CHECKING PRODUCTION STOREFRONT STATUS');
    console.log('='.repeat(70));

    await sequelize.authenticate();
    const dbName = process.env.DATABASE_URL ? 'Production (Render)' : 'Local Development';
    console.log(`Database: ${dbName}\n`);

    // Check if storefront_items table exists
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'storefront_items'
      ) as exists;
    `);

    if (!tableExists[0].exists) {
      console.log('❌ storefront_items table does not exist');
      console.log('   Run migrations first: npm run migrate:production\n');
      await sequelize.close();
      return;
    }

    console.log('✅ storefront_items table exists\n');

    // Check package count
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as count FROM storefront_items;
    `);

    const packageCount = parseInt(countResult[0].count);
    console.log(`📦 Package Count: ${packageCount}\n`);

    if (packageCount === 0) {
      console.log('⚠️  NO PACKAGES FOUND - Seeder needed!');
      console.log('   Run: node backend/seed-storefront-production.mjs\n');
    } else {
      console.log('✅ Packages exist in database');

      // Show packages
      const [packages] = await sequelize.query(`
        SELECT id, name, sessions, "pricePerSession", "totalCost", "isActive"
        FROM storefront_items
        ORDER BY "displayOrder"
        LIMIT 10;
      `);

      console.log('\n📋 Current Packages:');
      packages.forEach(p => {
        const status = p.isActive ? '✅' : '❌';
        const sessions = p.sessions || 'custom';
        console.log(`   ${status} ${p.name} - ${sessions} sessions - $${p.totalCost}`);
      });

      console.log('\n✅ PRODUCTION STOREFRONT IS READY');
      console.log('   No seeder needed - packages already exist\n');
    }

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkProductionStorefront();
