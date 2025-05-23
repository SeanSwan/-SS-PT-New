/**
 * Comprehensive Password Diagnosis
 */

import User from '../models/User.mjs';
import bcrypt from 'bcryptjs';
import sequelize from '../database.mjs';
import dotenv from 'dotenv';

dotenv.config();

async function comprehensivePasswordTest() {
  console.log('🔬 COMPREHENSIVE PASSWORD DIAGNOSIS');
  console.log('=====================================');
  
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Find admin user
    console.log('\n1. Finding admin user...');
    const admin = await User.findOne({
      where: { username: 'admin' }
    });
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    console.log('✅ Admin user found:');
    console.log(`   - Username: ${admin.username}`);
    console.log(`   - Email: ${admin.email}`);
    console.log(`   - Role: ${admin.role}`);
    console.log(`   - Password exists: ${!!admin.password}`);
    console.log(`   - Password length: ${admin.password?.length}`);
    console.log(`   - Password starts with $2: ${admin.password?.startsWith('$2')}`);
    
    // Test checkPassword method
    console.log('\n2. Testing checkPassword method...');
    const testPasswords = ['admin123', 'admin', 'Admin123', '123456'];
    
    for (const pwd of testPasswords) {
      try {
        const result = await admin.checkPassword(pwd);
        console.log(`   - "${pwd}": ${result ? '✅ VALID' : '❌ invalid'}`);
        if (result) {
          console.log(`   🎯 FOUND WORKING PASSWORD: "${pwd}"`);
          return { success: true, password: pwd };
        }
      } catch (error) {
        console.log(`   - "${pwd}": ❌ ERROR - ${error.message}`);
      }
    }
    
    // Test direct bcrypt comparison
    console.log('\n3. Testing direct bcrypt comparison...');
    const directTests = ['admin123', 'admin', 'Admin123'];
    
    for (const pwd of directTests) {
      try {
        const result = await bcrypt.compare(pwd, admin.password);
        console.log(`   - "${pwd}": ${result ? '✅ VALID' : '❌ invalid'}`);
        if (result) {
          console.log(`   🎯 FOUND WORKING PASSWORD (direct): "${pwd}"`);
          return { success: true, password: pwd };
        }
      } catch (error) {
        console.log(`   - "${pwd}": ❌ ERROR - ${error.message}`);
      }
    }
    
    // Hash analysis
    console.log('\n4. Analyzing current password hash...');
    console.log(`   Full hash: ${admin.password}`);
    console.log(`   Hash parts:`);
    if (admin.password?.startsWith('$2')) {
      const parts = admin.password.split('$');
      console.log(`     Algorithm: $${parts[1]}$`);
      console.log(`     Salt rounds: ${parts[2]}`);
      console.log(`     Salt: ${parts[3]}`);
      console.log(`     Hash: ${parts[4]}`);
    }
    
    // Verify with manual hash creation
    console.log('\n5. Creating and testing manual hash...');
    const testPassword = 'admin123';
    
    // Method 1: Using same salt rounds as existing
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const manualHash = await bcrypt.hash(testPassword, salt);
    console.log(`   Created hash: ${manualHash}`);
    
    const manualVerify = await bcrypt.compare(testPassword, manualHash);
    console.log(`   Manual hash verification: ${manualVerify ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    // Method 2: Update with new hash and test
    console.log('\n6. Updating password and testing...');
    const newSalt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash('admin123', newSalt);
    
    // Update without triggering hooks
    await sequelize.models.User.update(
      { password: newHash },
      { 
        where: { id: admin.id },
        hooks: false // Skip model hooks
      }
    );
    
    // Fetch updated user
    const updatedAdmin = await User.findOne({
      where: { username: 'admin' }
    });
    
    console.log('   Updated password in database');
    console.log(`   New hash: ${updatedAdmin.password}`);
    
    // Test updated password
    const updatedTest = await updatedAdmin.checkPassword('admin123');
    console.log(`   Updated password test: ${updatedTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    // Direct comparison test
    const directUpdatedTest = await bcrypt.compare('admin123', updatedAdmin.password);
    console.log(`   Direct comparison test: ${directUpdatedTest ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (updatedTest && directUpdatedTest) {
      console.log('\n🎉 PASSWORD FIXED SUCCESSFULLY!');
      console.log('   Admin can now login with: admin123');
      return { success: true, fixed: true };
    } else {
      console.log('\n❌ PASSWORD STILL NOT WORKING');
      console.log('   There may be an issue with the User model or bcrypt setup');
      return { success: false, error: 'Password verification still failing' };
    }
    
  } catch (error) {
    console.error('\n❌ ANALYSIS ERROR:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
  }
}

comprehensivePasswordTest();
