/**
 * DATABASE STATUS CHECKER
 * =======================
 * Run this script to check the current state of your database
 * and migration status before attempting the enhanced social media migration.
 */

const { Sequelize } = require('sequelize');
const config = require('./config/config.cjs');

async function checkDatabaseStatus() {
  console.log('🔍 CHECKING DATABASE STATUS...\n');
  
  // Initialize Sequelize
  const sequelize = new Sequelize(config.development);
  
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');
    
    // Check migration status
    console.log('📋 MIGRATION STATUS:');
    const [migrations] = await sequelize.query(`
      SELECT name FROM "SequelizeMeta" ORDER BY name;
    `);
    
    console.log(`Found ${migrations.length} completed migrations:`);
    migrations.forEach(m => console.log(`  ✅ ${m.name}`));
    console.log('');
    
    // Check essential tables
    console.log('📊 ESSENTIAL TABLES STATUS:');
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const essentialTables = [
      'users', 'storefront_items', 'shopping_carts', 
      'cart_items', 'orders', 'SequelizeMeta'
    ];
    
    const existingTables = tables.map(t => t.table_name);
    
    essentialTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    });
    
    console.log('\n📋 ALL EXISTING TABLES:');
    existingTables.forEach(table => {
      console.log(`  📄 ${table}`);
    });
    
    // Check for enhanced social media tables
    console.log('\n🌟 ENHANCED SOCIAL MEDIA TABLES:');
    const enhancedTables = [
      'EnhancedSocialPosts', 'SocialConnections', 'Communities',
      'CommunityMemberships', 'Conversations', 'Messages',
      'EnhancedNotifications', 'LiveStreams', 'CreatorProfiles'
    ];
    
    enhancedTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`  ${exists ? '✅' : '⏳'} ${table}`);
    });
    
    // Check for problematic migrations
    console.log('\n🚨 PROBLEMATIC MIGRATIONS CHECK:');
    const problematicMigrations = [
      '20250517000000-add-unique-constraints-storefront.cjs',
      '20250523170000-add-missing-price-column.cjs',
      '20250528000002-fix-uuid-foreign-keys.cjs'
    ];
    
    for (const migration of problematicMigrations) {
      const completed = migrations.some(m => m.name === migration);
      console.log(`  ${completed ? '✅' : '❌'} ${migration}`);
    }
    
    // Check storefront_items table structure
    console.log('\n📊 STOREFRONT_ITEMS TABLE STRUCTURE:');
    try {
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'storefront_items' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `);
      
      if (columns.length > 0) {
        columns.forEach(col => {
          console.log(`  📄 ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      } else {
        console.log('  ❌ storefront_items table not found');
      }
    } catch (error) {
      console.log(`  ❌ Error checking storefront_items: ${error.message}`);
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (!existingTables.includes('users')) {
      console.log('  🚨 Critical: Users table missing - run cleanup migration first');
    }
    
    if (!existingTables.includes('shopping_carts')) {
      console.log('  ⚠️  Shopping carts table missing - run cleanup migration');
    }
    
    const hasEnhancedTables = enhancedTables.some(table => existingTables.includes(table));
    if (!hasEnhancedTables) {
      console.log('  🌟 Ready for Enhanced Social Media Platform migration!');
      console.log('  📋 Run: npx sequelize-cli db:migrate');
    } else {
      console.log('  ✅ Enhanced Social Media Platform partially/fully installed');
    }
    
    console.log('\n✨ Database status check completed!\n');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('  1. Check your database is running');
    console.log('  2. Verify connection settings in config/config.cjs');
    console.log('  3. Ensure database user has proper permissions');
  } finally {
    await sequelize.close();
  }
}

// Run the check
checkDatabaseStatus().catch(console.error);
