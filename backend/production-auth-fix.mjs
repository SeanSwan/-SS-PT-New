#!/usr/bin/env node

/**
 * SwanStudios Production Database Authentication Fix
 * Applies the same password hash fix to production database on Render
 * 
 * Usage: 
 * 1. Deploy this script to Render
 * 2. Run via Render shell: node production-auth-fix.mjs
 */

import bcrypt from 'bcryptjs';
import sequelize from './database.mjs';
import User from './models/User.mjs';

console.log('🔧 SwanStudios Production Authentication Fix');
console.log('===========================================\n');

async function fixProductionAuth() {
  try {
    console.log('🔌 Connecting to production database...');
    await sequelize.authenticate();
    console.log('✅ Production database connection successful\n');

    // Production admin credentials to fix
    const prodCredentials = {
      username: 'admin',
      email: 'admin@swanstudios.com',
      password: 'admin123'
    };

    console.log('🔍 Checking production admin user...');
    const prodUser = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { username: prodCredentials.username },
          { email: prodCredentials.email }
        ]
      }
    });

    if (prodUser) {
      console.log(`✅ Found production user: ${prodUser.username} (ID: ${prodUser.id})`);
      console.log(`   Email: ${prodUser.email}`);
      console.log(`   Role: ${prodUser.role}`);
      
      console.log('\n🧪 Testing production password verification...');
      const currentTest = await prodUser.checkPassword(prodCredentials.password);
      console.log(`   Current verification: ${currentTest ? '✅ WORKING' : '❌ BROKEN'}`);
      
      if (!currentTest) {
        console.log('\n🔧 FIXING PRODUCTION PASSWORD HASH...');
        
        // Generate new hash
        const salt = await bcrypt.genSalt(10);
        const newHash = await bcrypt.hash(prodCredentials.password, salt);
        
        // Update production user
        await prodUser.update({ 
          password: newHash,
          isActive: true,
          failedLoginAttempts: 0,
          isLocked: false
        });
        
        console.log('✅ Production password hash updated');
        
        // Verify fix
        const verifyTest = await prodUser.checkPassword(prodCredentials.password);
        console.log(`🧪 Verification test: ${verifyTest ? '✅ PASS' : '❌ STILL FAILING'}`);
        
        if (verifyTest) {
          console.log('\n🎉 PRODUCTION AUTHENTICATION FIXED!');
          console.log('📋 Production Login Credentials:');
          console.log(`   Username: ${prodCredentials.username}`);
          console.log(`   Password: ${prodCredentials.password}`);
          console.log(`   URL: https://sswanstudios.com`);
        }
      } else {
        console.log('\n✅ Production authentication already working!');
      }
      
    } else {
      console.log('❌ No production admin user found. Creating one...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(prodCredentials.password, salt);
      
      const newProdUser = await User.create({
        username: prodCredentials.username,
        email: prodCredentials.email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true
      });
      
      console.log(`✅ Created production admin: ${newProdUser.username} (ID: ${newProdUser.id})`);
      console.log('📋 Production Login Credentials:');
      console.log(`   Username: ${prodCredentials.username}`);
      console.log(`   Password: ${prodCredentials.password}`);
    }

    console.log('\n🎯 PRODUCTION FIX COMPLETE!');
    return true;

  } catch (error) {
    console.error('❌ Production fix error:', error.message);
    console.error('Full error:', error);
    return false;
  } finally {
    try {
      await sequelize.close();
      console.log('\n🔌 Production database connection closed');
    } catch (closeError) {
      console.log('⚠️ Error closing production connection:', closeError.message);
    }
  }
}

// Execute production fix
async function main() {
  console.log('🚀 Starting production database authentication fix...\n');
  
  const success = await fixProductionAuth();
  
  if (success) {
    console.log('\n✅ PRODUCTION AUTHENTICATION READY!');
    console.log('🌐 Test login at: https://sswanstudios.com');
    process.exit(0);
  } else {
    console.log('\n💥 Production fix failed. Check errors above.');
    process.exit(1);
  }
}

main();
