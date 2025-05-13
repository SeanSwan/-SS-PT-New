// backend/scripts/test-postgres-connection.mjs
import { exec } from 'child_process';
import { promisify } from 'util';
import sequelize from '../database.mjs';

const execAsync = promisify(exec);

async function testPostgresConnection() {
  console.log('🧪 Testing PostgreSQL Connection\n');
  
  // Test 1: Check if psql is now available
  console.log('1. Testing psql command availability...');
  try {
    const { stdout } = await execAsync('psql --version');
    console.log('✅ psql available:', stdout.trim());
  } catch (error) {
    console.log('❌ psql still not available');
    console.log('💡 Make sure you ran the fix script as Administrator and restarted terminal');
    return;
  }
  
  // Test 2: Test direct database connection
  console.log('\n2. Testing database connection...');
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize connection successful');
    
    // Test 3: Check database
    const [results] = await sequelize.query('SELECT version();');
    console.log('✅ Database query successful');
    console.log('   PostgreSQL version:', results[0].version.split(' ')[0], results[0].version.split(' ')[1]);
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n🔐 Authentication Issue Detected:');
      console.log('The PATH is fixed, but authentication is failing.');
      console.log('This might be because your dev tool credentials differ from .env');
      console.log('\nNext steps:');
      console.log('1. Use your dev tool to connect successfully');
      console.log('2. Check what credentials it uses');
      console.log('3. Update .env file accordingly');
    }
  }
  
  // Test 4: Test storefront packages
  console.log('\n3. Testing storefront packages access...');
  try {
    const { default: StorefrontItem } = await import('../models/StorefrontItem.mjs');
    const count = await StorefrontItem.count();
    console.log(`✅ Found ${count} storefront packages`);
    
    if (count === 0) {
      console.log('💡 No packages found. Run seeder:');
      console.log('   node scripts/seed-storefront-enhanced.mjs');
    }
  } catch (error) {
    console.log('❌ Storefront test failed:', error.message);
  }
  
  console.log('\n✨ Connection test complete!');
}

testPostgresConnection().catch(console.error);