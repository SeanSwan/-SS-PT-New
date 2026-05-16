#!/usr/bin/env node

/**
 * SwanStudios Production Admin User Creator
 * ========================================
 * Creates/updates admin user with credentials: admin / admin123
 * 
 * Usage: node create-admin-prod.mjs
 * Run from: backend/ directory
 */

import bcrypt from 'bcrypt';
import sequelize from './database.mjs';
import { initializeModelsCache, getUser } from './models/index.mjs';

console.log('🔧 SwanStudios Admin User Creator');
console.log('=================================\n');

async function createAdminUser() {
  try {
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    console.log('🔄 Initializing models...');
    await initializeModelsCache();
    const User = getUser();
    console.log('✅ Models initialized\n');

    // Target admin credentials
    const adminCredentials = {
      username: 'admin',
      email: 'admin@swanstudios.com',
      password: 'admin123'
    };

    console.log('🔍 Checking for existing admin user...');
    console.log(`   Looking for username: "${adminCredentials.username}"`);
    console.log(`   Looking for email: "${adminCredentials.email}"\n`);
    
    // Check if admin user already exists (search by username OR email)
    const existingAdmin = await User.findOne({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { username: adminCredentials.username },
          { email: adminCredentials.email }
        ]
      }
    });

    // Hash the password
    console.log('🔒 Hashing password...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminCredentials.password, saltRounds);

    const adminData = {
      username: adminCredentials.username,
      email: adminCredentials.email,
      password: hashedPassword,
      firstName: 'Sean',
      lastName: 'Swan',
      role: 'admin',
      isActive: true,
      emailVerified: true,
      isEmailVerified: true, // Some schemas might use this variant
      profileCompleted: true,
      onboardingCompleted: true
    };

    if (existingAdmin) {
      console.log('👤 Admin user found! Updating credentials...');
      console.log(`   Current ID: ${existingAdmin.id}`);
      console.log(`   Current Username: ${existingAdmin.username}`);
      console.log(`   Current Email: ${existingAdmin.email}`);
      console.log(`   Current Role: ${existingAdmin.role}\n`);
      
      // Update existing user with new password and ensure admin role
      await existingAdmin.update({
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        emailVerified: true,
        isEmailVerified: true,
        profileCompleted: true,
        onboardingCompleted: true
      });
      
      console.log('✅ Admin user updated successfully!');
      
    } else {
      console.log('➕ No admin user found. Creating new admin user...\n');
      
      // Create new admin user
      const newAdmin = await User.create(adminData);
      
      console.log('✅ Admin user created successfully!');
      console.log(`   New ID: ${newAdmin.id}`);
    }

    // Verify the final state
    const finalAdmin = await User.findOne({
      where: { username: adminCredentials.username }
    });

    console.log('\n📋 FINAL ADMIN USER STATE:');
    console.log('==========================');
    console.log(`ID: ${finalAdmin.id}`);
    console.log(`Username: ${finalAdmin.username}`);
    console.log(`Email: ${finalAdmin.email}`);
    console.log(`Role: ${finalAdmin.role}`);
    console.log(`Active: ${finalAdmin.isActive}`);
    console.log(`Email Verified: ${finalAdmin.emailVerified || finalAdmin.isEmailVerified}`);

    console.log('\n🧪 Testing password verification...');
    const passwordTest = await bcrypt.compare(adminCredentials.password, finalAdmin.password);
    console.log(`Password test: ${passwordTest ? '✅ PASS' : '❌ FAIL'}`);

    if (!passwordTest) {
      throw new Error('Password verification failed - something went wrong with hashing');
    }

    console.log('\n🎯 ADMIN LOGIN CREDENTIALS:');
    console.log('===========================');
    console.log(`Username: ${adminCredentials.username}`);
    console.log(`Password: ${adminCredentials.password}`);
    console.log('');

    console.log('🌐 READY TO TEST:');
    console.log('=================');
    console.log('1. Go to: https://sswanstudios.com');
    console.log('2. Login with the credentials above');
    console.log('3. Should receive 200 OK with user data and JWT token');
    console.log('');

    console.log('✅ Admin user setup completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    // Provide specific troubleshooting based on error type
    if (error.name === 'SequelizeConnectionError') {
      console.log('\n💡 CONNECTION TROUBLESHOOTING:');
      console.log('1. Check if DATABASE_URL environment variable is correct');
      console.log('2. Verify PostgreSQL database is running and accessible');
      console.log('3. Check firewall/network connectivity to database');
      console.log('4. Verify SSL settings if required');
      
    } else if (error.name === 'SequelizeUniqueConstraintError') {
      console.log('\n💡 UNIQUENESS CONFLICT:');
      console.log('1. User with this username/email already exists');
      console.log('2. Try different credentials or check existing users');
      console.log('3. Run: node scripts/show-all-users.mjs (if exists)');
      
    } else if (error.name === 'SequelizeDatabaseError') {
      console.log('\n💡 DATABASE SCHEMA ISSUE:');
      console.log('1. Check if users table exists');
      console.log('2. Verify users table has required columns');
      console.log('3. Check if role enum includes "admin" value');
      console.log('4. Run database migrations if needed');
      
    } else if (error.name === 'SequelizeValidationError') {
      console.log('\n💡 VALIDATION ERROR:');
      console.log('1. Check User model validation rules');
      console.log('2. Some required fields might be missing');
      console.log('3. Check password length/complexity requirements');
      
    } else {
      console.log('\n💡 GENERAL TROUBLESHOOTING:');
      console.log('1. Check backend logs for more details');
      console.log('2. Verify all required environment variables are set');
      console.log('3. Test database connection manually');
      console.log('4. Check User model definition');
    }
    
    // Show the full error for debugging
    console.log('\n🐛 FULL ERROR DETAILS:');
    console.log(error);
    
    return false;
  } finally {
    // Always close the database connection
    try {
      await sequelize.close();
      console.log('\n🔌 Database connection closed');
    } catch (closeError) {
      console.log('\n⚠️ Error closing database connection:', closeError.message);
    }
  }
}

// Execute the admin creation
async function main() {
  const success = await createAdminUser();
  
  if (success) {
    console.log('\n🎉 SUCCESS! Admin user is ready for production login.');
    process.exit(0);
  } else {
    console.log('\n💥 FAILED! Check the errors above and try again.');
    process.exit(1);
  }
}

// Run the script
main();
