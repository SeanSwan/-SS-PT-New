/**
 * Admin Account Diagnostic and Repair Script
 * 
 * This script diagnoses login issues by:
 * 1. Testing database connection
 * 2. Checking if admin user exists
 * 3. Verifying password hash format
 * 4. Resetting admin password if needed
 * 
 * Run with: node admin-account-check.mjs
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import sequelize, { Op } from '../database.mjs';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '../..');

// Load environment variables
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  dotenv.config(); // Try default location
}

// New password to set
const NEW_PASSWORD = 'Password123!';

async function diagnoseAndFix() {
  console.log('\n======= ADMIN ACCOUNT DIAGNOSTIC =======\n');
  
  try {
    // Step 1: Test database connection
    console.log('Step 1: Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Get credentials from environment or defaults
    const adminUsername = process.env.ADMIN_USERNAME || 'ogpswan';
    const adminEmail = process.env.ADMIN_EMAIL || 'ogpswan@yahoo.com';
    
    // Import User model dynamically to avoid circular dependency issues
    let User;
    try {
      const UserModule = await import('../models/User.mjs');
      User = UserModule.default;
      console.log('✅ User model imported successfully');
    } catch (err) {
      console.error('❌ Failed to import User model:', err.message);
      process.exit(1);
    }
    
    // Step 2: Check if admin user exists
    console.log(`\nStep 2: Checking if user "${adminUsername}" exists...`);
    let adminUser = await User.findOne({ 
      where: { 
        [Op.or]: [
          { username: adminUsername },
          { email: adminEmail }
        ]
      }
    });
    
    if (adminUser) {
      console.log(`✅ Found user: ${adminUser.username} (${adminUser.firstName} ${adminUser.lastName})`);
      console.log(`  - Role: ${adminUser.role}`);
      console.log(`  - Email: ${adminUser.email}`);
      console.log(`  - Status: ${adminUser.isActive ? 'Active' : 'Inactive'}`);
      
      // Check if user is admin
      if (adminUser.role !== 'admin') {
        console.log(`\n⚠️ User exists but is not an admin (current role: ${adminUser.role})`);
        console.log('   Upgrading user to admin role...');
        await adminUser.update({ role: 'admin' });
        console.log('✅ User role upgraded to admin');
      }
    } else {
      console.log(`❌ User "${adminUsername}" not found in database`);
      console.log('Creating admin user...');
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
      
      // Create admin user
      adminUser = await User.create({
        username: adminUsername,
        email: adminEmail,
        firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
        lastName: process.env.ADMIN_LAST_NAME || 'User',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      
      console.log(`✅ Admin user "${adminUsername}" created successfully`);
    }
    
    // Step 3: Check password hash
    console.log('\nStep 3: Checking password hash format...');
    if (!adminUser.password || !adminUser.password.startsWith('$2')) {
      console.log('❌ Password hash is missing or has invalid format');
    } else {
      console.log('✅ Password hash has valid format');
    }
    
    // Step 4: Reset password
    console.log('\nStep 4: Resetting admin password...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);
    
    await adminUser.update({ 
      password: hashedPassword,
      isActive: true // Ensure account is active
    });
    
    console.log('✅ Password reset successfully');
    
    // Step 5: Verify password
    console.log('\nStep 5: Verifying new password...');
    const isMatch = await bcrypt.compare(NEW_PASSWORD, adminUser.password);
    
    if (isMatch) {
      console.log('✅ Password verification successful');
    } else {
      console.log('❌ Password verification failed');
      console.log('   This indicates a possible issue with password hashing');
    }
    
    // Step 6: Test login
    console.log('\nStep 6: Testing mock login...');
    const mockLogin = await User.findOne({ 
      where: { username: adminUsername }
    });
    
    if (mockLogin) {
      const passwordCorrect = await mockLogin.checkPassword(NEW_PASSWORD);
      
      if (passwordCorrect) {
        console.log('✅ Mock login successful');
      } else {
        console.log('❌ Mock login failed - password error');
      }
    } else {
      console.log('❌ Mock login failed - user not found');
    }
    
    // Provide login instructions
    console.log('\n======= LOGIN INFORMATION =======');
    console.log(`Username: ${adminUser.username}`);
    console.log(`Password: ${NEW_PASSWORD}`);
    console.log('================================');
    
    // Close database connection
    await sequelize.close();
    console.log('\nDatabase connection closed');
    
    console.log('\n✅ ADMIN ACCOUNT FIXED SUCCESSFULLY\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    
    // Provide database connection hints
    if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError') {
      console.log('\nDatabase Connection Troubleshooting:');
      console.log('1. Check if PostgreSQL is running');
      console.log('2. Verify database credentials in .env file:');
      console.log(`   - Database: ${process.env.PG_DB || 'Not set'}`);
      console.log(`   - Username: ${process.env.PG_USER || 'Not set'}`);
      console.log(`   - Host: ${process.env.PG_HOST || 'Not set'}`);
      console.log(`   - Port: ${process.env.PG_PORT || 'Not set'}`);
    }
    
    process.exit(1);
  }
}

// Run the script
diagnoseAndFix();
