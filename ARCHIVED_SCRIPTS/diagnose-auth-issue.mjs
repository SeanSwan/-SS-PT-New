#!/usr/bin/env node

/**
 * SwanStudios Authentication Diagnostic Tool
 * Precisely identifies and fixes the login failure issue
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create require function for backend dependencies
const require = createRequire(join(__dirname, 'backend', 'package.json'));

// Import backend modules using dynamic imports
const bcrypt = (await import('./backend/node_modules/bcryptjs/index.js')).default;
const bcryptNode = (await import('./backend/node_modules/bcrypt/bcrypt.js')).default;
const { default: sequelize } = await import('./backend/database.mjs');
const { default: User } = await import('./backend/models/User.mjs');

console.log('🔧 SwanStudios Authentication Diagnostic Tool');
console.log('============================================\n');

async function diagnoseAuthIssue() {
  try {
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Test credentials
    const testCredentials = {
      username: 'admin',
      email: 'admin@swanstudios.com',
      password: 'admin123'
    };

    console.log('🔍 Step 1: Check for existing admin user...');
    const existingUser = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { username: testCredentials.username },
          { email: testCredentials.email }
        ]
      }
    });

    if (existingUser) {
      console.log(`✅ Found existing user: ${existingUser.username} (ID: ${existingUser.id})`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Password Hash: ${existingUser.password.substring(0, 20)}...`);
      
      console.log('\n🧪 Step 2: Test password verification...');
      
      // Test with bcryptjs (used in model)
      console.log('   Testing with bcryptjs...');
      const bcryptjsResult = await bcrypt.compare(testCredentials.password, existingUser.password);
      console.log(`   bcryptjs result: ${bcryptjsResult ? '✅ PASS' : '❌ FAIL'}`);
      
      // Test with bcrypt (if different)
      console.log('   Testing with bcrypt...');
      const bcryptResult = await bcryptNode.compare(testCredentials.password, existingUser.password);
      console.log(`   bcrypt result: ${bcryptResult ? '✅ PASS' : '❌ FAIL'}`);
      
      // Test with model method
      console.log('   Testing with User.checkPassword()...');
      const modelResult = await existingUser.checkPassword(testCredentials.password);
      console.log(`   Model method result: ${modelResult ? '✅ PASS' : '❌ FAIL'}`);
      
      if (!bcryptjsResult || !bcryptResult || !modelResult) {
        console.log('\n🚨 PASSWORD VERIFICATION FAILED!');
        console.log('🔧 Applying fix...');
        
        // Rehash password correctly
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(testCredentials.password, salt);
        
        await existingUser.update({ password: newHash });
        console.log('✅ Password hash updated');
        
        // Re-test
        const retestResult = await existingUser.checkPassword(testCredentials.password);
        console.log(`🧪 Retest result: ${retestResult ? '✅ PASS' : '❌ STILL FAILING'}`);
        
        if (retestResult) {
          console.log('\n🎉 AUTHENTICATION ISSUE FIXED!');
          console.log('📋 Login Credentials:');
          console.log(`   Username: ${testCredentials.username}`);
          console.log(`   Password: ${testCredentials.password}`);
        } else {
          console.log('\n❌ Fix failed. Deeper investigation needed.');
        }
      } else {
        console.log('\n✅ Authentication is working correctly!');
        console.log('📋 Login Credentials:');
        console.log(`   Username: ${testCredentials.username}`);
        console.log(`   Password: ${testCredentials.password}`);
      }
    } else {
      console.log('❌ No admin user found. Creating one...');
      
      // Create new admin user with proper password hashing
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(testCredentials.password, salt);
      
      const newUser = await User.create({
        username: testCredentials.username,
        email: testCredentials.email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        emailNotifications: true,
        smsNotifications: true
      });
      
      console.log(`✅ Created new admin user: ${newUser.username} (ID: ${newUser.id})`);
      
      // Test the new user
      const testResult = await newUser.checkPassword(testCredentials.password);
      console.log(`🧪 Login test: ${testResult ? '✅ PASS' : '❌ FAIL'}`);
      
      if (testResult) {
        console.log('\n🎉 NEW ADMIN USER CREATED AND VERIFIED!');
        console.log('📋 Login Credentials:');
        console.log(`   Username: ${testCredentials.username}`);
        console.log(`   Password: ${testCredentials.password}`);
      }
    }

    console.log('\n🔍 Step 3: Library version check...');
    const bcryptjsVersion = require('./backend/node_modules/bcryptjs/package.json').version;
    const bcryptVersion = require('./backend/node_modules/bcrypt/package.json').version;
    console.log(`   bcryptjs version: ${bcryptjsVersion}`);
    console.log(`   bcrypt version: ${bcryptVersion}`);

    console.log('\n🎯 DIAGNOSIS COMPLETE!');
    return true;

  } catch (error) {
    console.error('❌ Diagnostic error:', error.message);
    console.error('Full error:', error);
    return false;
  } finally {
    try {
      await sequelize.close();
      console.log('\n🔌 Database connection closed');
    } catch (closeError) {
      console.log('⚠️ Error closing database:', closeError.message);
    }
  }
}

// Run diagnostic
async function main() {
  const success = await diagnoseAuthIssue();
  
  if (success) {
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Start your backend server: cd backend && npm start');
    console.log('2. Test login at: https://sswanstudios.com');
    console.log('3. Use the credentials provided above');
    process.exit(0);
  } else {
    console.log('\n💥 Diagnostic failed. Check the errors above.');
    process.exit(1);
  }
}

main();
