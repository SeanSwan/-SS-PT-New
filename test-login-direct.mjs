// Direct login test to diagnose the 500 error
import dotenv from 'dotenv';
import sequelize, { Op } from './backend/database.mjs';
import User from './backend/models/User.mjs';

// Load environment variables
dotenv.config();

const testLogin = async () => {
  try {
    console.log('🔍 Testing direct database queries for login debugging...\n');
    
    // Test database connection first
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');
    
    // Test 1: Check if users table exists and has data
    console.log('📊 Testing users table...');
    const userCount = await User.count();
    console.log(`Total users in database: ${userCount}\n`);
    
    // Test 2: Try to find a test user
    console.log('🔍 Looking for test admin user...');
    const testUser = await User.findOne({
      where: {
        [Op.or]: [
          { username: 'admin' },
          { email: 'admin@test.com' }
        ]
      }
    });
    
    if (testUser) {
      console.log('✅ Found test user:');
      console.log(`- ID: ${testUser.id} (type: ${typeof testUser.id})`);
      console.log(`- Username: ${testUser.username}`);
      console.log(`- Email: ${testUser.email}`);
      console.log(`- Role: ${testUser.role}`);
      console.log(`- Active: ${testUser.isActive}`);
      console.log(`- Locked: ${testUser.isLocked}`);
      console.log(`- Has password hash: ${!!testUser.password}`);
      console.log(`- Password starts with: ${testUser.password?.substring(0, 10)}...`);
      
      // Test 3: Try password comparison
      console.log('\n🔐 Testing password verification...');
      try {
        const isMatch = await testUser.checkPassword('admin123');
        console.log(`Password check result: ${isMatch}`);
      } catch (passwordError) {
        console.error('❌ Password check failed:', passwordError.message);
      }
      
    } else {
      console.log('❌ No test user found!');
      
      // Check what users exist
      console.log('\n📋 Existing users:');
      const allUsers = await User.findAll({
        attributes: ['id', 'username', 'email', 'role'],
        limit: 10
      });
      allUsers.forEach(user => {
        console.log(`- ${user.username} (${user.email}) - ${user.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database test failed:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.original) {
      console.error('Original error:', error.original.message);
    }
    console.error('Stack trace:', error.stack);
  } finally {
    await sequelize.close();
    console.log('\n🔚 Database connection closed');
  }
};

// Run the test
testLogin().catch(console.error);