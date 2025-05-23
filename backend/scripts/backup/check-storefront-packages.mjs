// backend/scripts/check-storefront-packages.mjs
import sequelize from '../database.mjs';
import StorefrontItem from '../models/StorefrontItem.mjs';

async function checkStorefrontPackages() {
  try {
    console.log('🔍 Checking storefront packages...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Check if StorefrontItem table exists
    const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'storefront_items'
      );
    `);
    
    console.log('Table exists:', results[0].exists);
    
    // Count existing packages
    const count = await StorefrontItem.count();
    console.log(`📦 Found ${count} storefront packages`);
    
    // Show all packages
    const packages = await StorefrontItem.findAll();
    console.log('📋 Package details:');
    packages.forEach(pkg => {
      console.log(`- ${pkg.name}: $${pkg.totalCost || pkg.price} (${pkg.packageType})`);
    });
    
    return {
      success: true,
      count,
      packages
    };
  } catch (error) {
    console.error('❌ Error checking storefront packages:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await sequelize.close();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkStorefrontPackages();
}

export default checkStorefrontPackages;