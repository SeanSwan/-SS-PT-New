/**
 * Check Admin User Role Script
 * ============================
 * This script checks the admin user's role in the database to verify
 * if the role is properly set and the authentication response is correct.
 */

import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger.mjs';
import sequelize from '../database.mjs';

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin user role...');
    
    // Find admin user by username
    const adminUser = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    console.log('✅ Admin user found');
    console.log('👤 Admin user details:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   First Name: ${adminUser.firstName}`);
    console.log(`   Last Name: ${adminUser.lastName}`);
    console.log(`   Is Active: ${adminUser.isActive}`);
    console.log(`   Created At: ${adminUser.createdAt}`);
    
    // Test password verification
    console.log('\n🔐 Testing password verification...');
    const isPasswordValid = await adminUser.checkPassword('admin123');
    console.log(`   Password 'admin123' is ${isPasswordValid ? 'VALID' : 'INVALID'}`);
    
    // Check if password field exists and is properly hashed
    console.log('\n🔗 Password hash info:');
    console.log(`   Has password field: ${!!adminUser.password}`);
    console.log(`   Password starts with $2: ${adminUser.password?.startsWith('$2')}`);
    console.log(`   Password length: ${adminUser.password?.length}`);
    
    // Try to parse the role field explicitly
    console.log('\n🏷️ Role analysis:');
    console.log(`   Raw role value: ${JSON.stringify(adminUser.role)}`);
    console.log(`   Role type: ${typeof adminUser.role}`);
    console.log(`   Role === 'admin': ${adminUser.role === 'admin'}`);
    
    // Check the dataValues directly
    console.log('\n📊 Raw data values:');
    console.log(JSON.stringify(adminUser.dataValues, null, 2));
    
    return {
      success: true,
      user: adminUser,
      roleCheck: adminUser.role === 'admin',
      passwordValid: isPasswordValid
    };
    
  } catch (error) {
    console.error('❌ Error checking admin user:', error);
    logger.error('Admin user check failed:', { error: error.message, stack: error.stack });
    return {
      success: false,
      error: error.message
    };
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkAdminUser()
    .then(result => {
      console.log('\n📋 Final Result:', result.success ? '✅ SUCCESS' : '❌ FAILED');
      if (!result.success) {
        console.log('Error:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Script execution failed:', error);
      process.exit(1);
    })
    .finally(() => {
      sequelize.close();
    });
}

export default checkAdminUser;
