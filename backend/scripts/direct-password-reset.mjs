/**
 * Direct Password Reset - Force Set Admin Password
 */

import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';
import sequelize from '../database.mjs';
import dotenv from 'dotenv';

dotenv.config();

async function directPasswordReset() {
  try {
    console.log('🔧 Direct password reset for admin...');
    
    // Find admin user
    const admin = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found');
      console.log('Creating new admin user...');
      
      // Create the admin user if it doesn't exist
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      const newAdmin = await User.create({
        username: 'admin',
        email: 'admin@swanstudios.com',
        password: hashedPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        isActive: true
      });
      
      console.log('✅ Admin user created with password: admin123');
      return { success: true, created: true };
    }
    
    console.log('✅ Found admin user:', admin.username);
    console.log('   Current role:', admin.role);
    
    // Force set new password
    console.log('\n🔄 Setting new password: admin123');
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Update the user directly
    await admin.update({
      password: hashedPassword,
      role: 'admin',  // Ensure role is set
      isActive: true   // Ensure account is active
    });
    
    console.log('✅ Password updated to: admin123');
    
    // Verify the new password
    const updated = await User.findOne({ where: { username: 'admin' } });
    const newPasswordValid = await updated.checkPassword('admin123');
    
    console.log('\n🔍 Verification:');
    console.log('   Password check:', newPasswordValid ? '✅ SUCCESS' : '❌ FAILED');
    console.log('   Role:', updated.role);
    console.log('   Is Active:', updated.isActive);
    
    // Test the checkPassword method directly
    console.log('\n🧪 Testing checkPassword method...');
    const directTest = await bcrypt.compare('admin123', updated.password);
    console.log('   Direct bcrypt compare:', directTest ? '✅ SUCCESS' : '❌ FAILED');
    
    return { 
      success: true, 
      passwordUpdated: true,
      passwordValid: newPasswordValid,
      directTest: directTest
    };
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
  }
}

directPasswordReset();
