/**
 * Fix Admin Password
 */

import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';
import sequelize from '../database.mjs';

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin password...');
    
    // Find admin user
    const admin = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Found admin user:', admin.username);
    console.log('   Current role:', admin.role);
    
    // Check current password hashes
    console.log('\n🔐 Current password info:');
    console.log('   Password length:', admin.password?.length);
    console.log('   Starts with $2:', admin.password?.startsWith('$2'));
    
    // Test various common passwords
    const testPasswords = ['admin123', 'admin', '123456', 'password', 'Admin123', 'ADMIN123'];
    
    console.log('\n🧪 Testing common passwords...');
    for (const pwd of testPasswords) {
      const isValid = await admin.checkPassword(pwd);
      console.log(`   ${pwd}: ${isValid ? '✅ VALID' : '❌ invalid'}`);
      if (isValid) {
        console.log(`\n🎯 Found working password: ${pwd}`);
        return { success: true, password: pwd };
      }
    }
    
    // If no password works, set a new one
    console.log('\n🔄 Setting new password: admin123');
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Update the user
    await admin.update({
      password: hashedPassword
    });
    
    // Verify the new password
    const updated = await User.findOne({ where: { username: 'admin' } });
    const newPasswordValid = await updated.checkPassword('admin123');
    
    console.log('✅ Password updated');
    console.log('   New password valid:', newPasswordValid);
    
    return { success: true, passwordUpdated: true };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
  }
}

fixAdminPassword();
