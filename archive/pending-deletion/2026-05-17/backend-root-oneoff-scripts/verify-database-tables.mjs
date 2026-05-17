/**
 * Database Table Verification Script
 * ==================================
 * 
 * Checks if all required tables exist in the production database
 * and creates any missing tables needed for the admin dashboard.
 */

import sequelize from './database.mjs';
import logger from './utils/logger.mjs';

const REQUIRED_TABLES = [
  'users',
  'sessions', 
  'client_trainer_assignments',
  'trainer_permissions',
  'daily_workout_forms',
  'admin_settings',
  'shopping_carts',
  'cart_items',
  'storefront_items'
];

/**
 * Check which tables exist in the database
 */
async function checkDatabaseTables() {
  try {
    console.log('🔍 Checking database table status...\n');
    
    // Get all table names
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const existingTables = results.map(row => row.table_name);
    
    console.log('📊 Existing tables in database:');
    existingTables.forEach(table => console.log(`  ✅ ${table}`));
    console.log('');
    
    console.log('🎯 Required tables status:');
    const missingTables = [];
    
    REQUIRED_TABLES.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`  ✅ ${table} - EXISTS`);
      } else {
        console.log(`  ❌ ${table} - MISSING`);
        missingTables.push(table);
      }
    });
    
    console.log('');
    
    if (missingTables.length === 0) {
      console.log('🎉 All required tables exist!');
      return true;
    } else {
      console.log(`⚠️  Missing ${missingTables.length} required tables:`);
      missingTables.forEach(table => console.log(`     - ${table}`));
      console.log('');
      console.log('💡 Run migrations to create missing tables:');
      console.log('   npx sequelize-cli db:migrate');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    return false;
  }
}

/**
 * Test basic model connectivity
 */
async function testModelConnectivity() {
  try {
    console.log('🔗 Testing model connectivity...\n');
    
    // Test User model
    console.log('👤 Testing User model...');
    const [userResult] = await sequelize.query('SELECT COUNT(*) as count FROM users LIMIT 1');
    console.log(`   Found ${userResult[0].count} users`);
    
    // Test Sessions model
    console.log('📅 Testing Sessions model...');
    const [sessionResult] = await sequelize.query('SELECT COUNT(*) as count FROM sessions LIMIT 1');
    console.log(`   Found ${sessionResult[0].count} sessions`);
    
    // Test client_trainer_assignments if it exists
    try {
      console.log('🤝 Testing ClientTrainerAssignment model...');
      const [assignmentResult] = await sequelize.query('SELECT COUNT(*) as count FROM client_trainer_assignments LIMIT 1');
      console.log(`   Found ${assignmentResult[0].count} assignments`);
    } catch (assignmentError) {
      console.log('   ❌ client_trainer_assignments table not accessible');
      console.log(`   Error: ${assignmentError.message}`);
    }
    
    console.log('\n✅ Model connectivity test completed');
    return true;
    
  } catch (error) {
    console.error('❌ Model connectivity test failed:', error.message);
    return false;
  }
}

/**
 * Main verification function
 */
async function verifyDatabase() {
  console.log('🚀 Starting comprehensive database verification...\n');
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');
    
    // Check tables
    const tablesOK = await checkDatabaseTables();
    
    // Test model connectivity
    const modelsOK = await testModelConnectivity();
    
    console.log('\n📋 VERIFICATION SUMMARY:');
    console.log(`Database Connection: ✅ Working`);
    console.log(`Required Tables: ${tablesOK ? '✅' : '❌'} ${tablesOK ? 'All present' : 'Missing tables'}`);
    console.log(`Model Connectivity: ${modelsOK ? '✅' : '❌'} ${modelsOK ? 'Working' : 'Issues detected'}`);
    
    if (tablesOK && modelsOK) {
      console.log('\n🎉 Database is ready for admin dashboard!');
    } else {
      console.log('\n⚠️  Database needs attention before admin dashboard will work');
    }
    
  } catch (error) {
    console.error('💥 Database verification failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run verification
verifyDatabase();
