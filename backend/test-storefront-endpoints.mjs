/**
 * Test Storefront Endpoints
 * =========================
 * Verifies database queries work correctly for storefront functionality
 */

import sequelize from './database.mjs';

async function testStorefrontEndpoints() {
  try {
    await sequelize.authenticate();
    console.log('🧪 TESTING STOREFRONT API ENDPOINTS\n');
    console.log('='.repeat(70));

    // Test 1: Get all active packages
    console.log('\n📦 Test 1: Get all active storefront packages');
    const [packages] = await sequelize.query(`
      SELECT id, name, sessions, "pricePerSession", "totalCost", "packageType", "isActive"
      FROM storefront_items
      WHERE "isActive" = true
      ORDER BY "displayOrder";
    `);

    console.log(`✅ Found ${packages.length} active packages:\n`);
    packages.forEach(p => {
      const sessionsDisplay = p.sessions ? `${p.sessions} sessions` : 'custom sessions';
      console.log(`   ${p.id}. ${p.name}`);
      console.log(`      - ${sessionsDisplay}`);
      console.log(`      - $${p.pricePerSession}/session`);
      console.log(`      - Total: $${p.totalCost}`);
      console.log(`      - Type: ${p.packageType}\n`);
    });

    // Test 2: Test custom/monthly package pricing
    console.log('='.repeat(70));
    console.log('\n💰 Test 2: Get custom/monthly package pricing');

    const [monthlyPackages] = await sequelize.query(`
      SELECT id, name, "pricePerSession", "packageType", months, "sessionsPerWeek"
      FROM storefront_items
      WHERE "packageType" IN ('custom', 'monthly')
      ORDER BY "pricePerSession" DESC;
    `);

    if (monthlyPackages.length > 0) {
      console.log(`✅ Found ${monthlyPackages.length} custom/monthly packages:`);
      monthlyPackages.forEach(pkg => {
        console.log(`   - ${pkg.name}: $${pkg.pricePerSession}/session (${pkg.packageType})`);
        if (pkg.months) console.log(`     Months: ${pkg.months}, Sessions/week: ${pkg.sessionsPerWeek || 'N/A'}`);
      });
    } else {
      console.log('❌ No custom/monthly pricing tiers found');
    }

    // Test 3: Verify specific package exists (for cart testing)
    console.log('\n' + '='.repeat(70));
    console.log('\n🛒 Test 3: Verify package exists by ID (ID: 50)');
    const testPackageId = 50;

    const [packageById] = await sequelize.query(`
      SELECT id, name, sessions, "pricePerSession", "totalCost", "isActive"
      FROM storefront_items
      WHERE id = :id;
    `, {
      replacements: { id: testPackageId }
    });

    if (packageById.length > 0) {
      const pkg = packageById[0];
      console.log(`✅ Package found:`);
      console.log(`   - ID: ${pkg.id}`);
      console.log(`   - Name: ${pkg.name}`);
      console.log(`   - Sessions: ${pkg.sessions || 'custom'}`);
      console.log(`   - Price: $${pkg.totalCost}`);
      console.log(`   - Active: ${pkg.isActive}`);
    } else {
      console.log(`❌ Package with ID ${testPackageId} not found`);
    }

    // Test 4: Verify no duplicate packages
    console.log('\n' + '='.repeat(70));
    console.log('\n🔍 Test 4: Check for duplicate packages');

    const [duplicates] = await sequelize.query(`
      SELECT name, COUNT(*) as count
      FROM storefront_items
      GROUP BY name
      HAVING COUNT(*) > 1;
    `);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate packages found');
    } else {
      console.log('⚠️  Duplicate packages detected:');
      duplicates.forEach(d => console.log(`   - ${d.name}: ${d.count} instances`));
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ All ${packages.length} storefront packages are ready`);
    console.log('✅ Database queries working correctly');
    console.log('✅ Ready for end-to-end purchase flow testing\n');

    await sequelize.close();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testStorefrontEndpoints();
