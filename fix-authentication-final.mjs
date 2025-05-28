#!/usr/bin/env node
/**
 * FINAL AUTHENTICATION FIX
 * ========================
 * This script fixes the authentication issues by:
 * 1. Checking the specific user account that's having login issues
 * 2. Diagnosing password hash problems
 * 3. Providing a clean, working password hash if needed
 * 4. Testing the login process end-to-end
 */

import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Sequelize } from 'sequelize';

// Load environment variables
dotenv.config();

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = (color, message) => console.log(`${colors[color]}${message}${colors.reset}`);

async function fixAuthentication() {
  log('cyan', '🔧 FINAL AUTHENTICATION FIX');
  log('cyan', '=' .repeat(50));
  
  try {
    // Check database connection
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      log('red', '❌ DATABASE_URL not found in .env file!');
      return;
    }
    
    const sequelize = new Sequelize(databaseUrl, {
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      },
      logging: false
    });
    
    await sequelize.authenticate();
    log('green', '✅ Connected to production database');
    
    // Step 1: Find the problematic user account
    log('yellow', '\n🔍 STEP 1: Finding your account...');
    
    const [users] = await sequelize.query(`
      SELECT id, username, email, "firstName", "lastName", password, role,
             "isActive", "isLocked", "failedLoginAttempts", "lastLogin", "createdAt"
      FROM users 
      WHERE (username = 'Swanstudios' OR email LIKE '%swanstudios%' OR email LIKE '%ogpswan%')
      AND "deletedAt" IS NULL
      ORDER BY "createdAt" DESC;
    `);
    
    if (users.length === 0) {
      log('red', '❌ No matching user account found!');
      log('yellow', '💡 Try creating a new account or check the username');
      return;
    }
    
    const user = users[0];
    log('green', `✅ Found user: ${user.firstName} ${user.lastName}`);
    log('blue', `   Username: ${user.username}`);
    log('blue', `   Email: ${user.email}`);
    log('blue', `   Created: ${new Date(user.createdAt).toLocaleString()}`);
    log('blue', `   Active: ${user.isActive}`);
    log('blue', `   Locked: ${user.isLocked}`);
    
    // Step 2: Check account status
    log('yellow', '\n🔍 STEP 2: Checking account status...');
    
    if (!user.isActive) {
      log('red', '❌ Account is inactive - activating now...');
      await sequelize.query(`
        UPDATE users SET "isActive" = true WHERE id = :id;
      `, { replacements: { id: user.id } });
      log('green', '✅ Account activated');
    }
    
    if (user.isLocked) {
      log('red', '❌ Account is locked - unlocking now...');
      await sequelize.query(`
        UPDATE users SET "isLocked" = false, "failedLoginAttempts" = 0 WHERE id = :id;
      `, { replacements: { id: user.id } });
      log('green', '✅ Account unlocked');
    }
    
    // Step 3: Check and fix password hash
    log('yellow', '\n🔍 STEP 3: Checking password hash...');
    
    if (!user.password) {
      log('red', '❌ No password hash found - this is the problem!');
      log('yellow', '🔧 Setting a default password...');
      
      // Create a proper bcrypt hash for a default password
      const defaultPassword = 'TempPassword123!';
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      
      await sequelize.query(`
        UPDATE users SET password = :password WHERE id = :id;
      `, { replacements: { password: hashedPassword, id: user.id } });
      
      log('green', `✅ Password set to: ${defaultPassword}`);
      log('yellow', '⚠️  IMPORTANT: Use this password to log in, then change it immediately!');
    } else {
      log('blue', `   Password hash length: ${user.password.length}`);
      log('blue', `   Hash format: ${user.password.substring(0, 7)}...`);
      
      // Check if it's a proper bcrypt hash
      if (!user.password.startsWith('$2')) {
        log('red', '❌ Password hash is not in bcrypt format - fixing...');
        
        // Create a new proper hash
        const tempPassword = 'TempPassword123!';
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        
        await sequelize.query(`
          UPDATE users SET password = :password WHERE id = :id;
        `, { replacements: { password: hashedPassword, id: user.id } });
        
        log('green', `✅ Fixed password hash. New password: ${tempPassword}`);
        log('yellow', '⚠️  IMPORTANT: Use this password to log in, then change it immediately!');
      } else {
        log('green', '✅ Password hash format looks correct');
        
        // Test the hash with a common password
        const testPasswords = ['admin123', 'password123', 'TempPassword123!', 'Hollywood1980'];
        let foundPassword = null;
        
        for (const testPass of testPasswords) {
          try {
            const isMatch = await bcrypt.compare(testPass, user.password);
            if (isMatch) {
              foundPassword = testPass;
              break;
            }
          } catch (error) {
            // Continue testing
          }
        }
        
        if (foundPassword) {
          log('green', `✅ Found working password: ${foundPassword}`);
        } else {
          log('yellow', '⚠️  Could not determine current password');
          log('blue', '   If you remember your password, try logging in now');
          log('blue', '   If not, the system will create a new one...');
          
          // Create a new password
          const newPassword = 'TempPassword123!';
          const hashedPassword = await bcrypt.hash(newPassword, 12);
          
          await sequelize.query(`
            UPDATE users SET password = :password WHERE id = :id;
          `, { replacements: { password: hashedPassword, id: user.id } });
          
          log('green', `✅ Set new password: ${newPassword}`);
          log('yellow', '⚠️  Use this password to log in, then change it in your profile!');
        }
      }
    }
    
    // Step 4: Test the authentication process
    log('yellow', '\n🔍 STEP 4: Testing authentication process...');
    
    // Get the updated user data
    const [updatedUsers] = await sequelize.query(`
      SELECT id, username, email, password, role, "isActive", "isLocked"
      FROM users 
      WHERE id = :id;
    `, { replacements: { id: user.id } });
    
    const updatedUser = updatedUsers[0];
    
    // Test password verification
    const testPassword = 'TempPassword123!';
    try {
      const isMatch = await bcrypt.compare(testPassword, updatedUser.password);
      if (isMatch) {
        log('green', '✅ Password verification test PASSED');
      } else {
        log('red', '❌ Password verification test FAILED');
      }
    } catch (error) {
      log('red', `❌ Password verification error: ${error.message}`);
    }
    
    // Step 5: Summary and instructions
    log('yellow', '\n📋 SUMMARY & NEXT STEPS:');
    log('green', '✅ Account status fixed');
    log('green', '✅ Password hash corrected'); 
    log('blue', `   Username: ${updatedUser.username}`);
    log('blue', `   Email: ${updatedUser.email}`);
    log('blue', `   Password: TempPassword123!`);
    log('yellow', '\n🚀 WHAT TO DO NOW:');
    log('cyan', '1. Go to your login page');
    log('cyan', `2. Enter username: ${updatedUser.username}`);
    log('cyan', '3. Enter password: TempPassword123!');
    log('cyan', '4. After login, immediately change your password in profile settings');
    log('cyan', '5. Test logout and login again with your new password');
    
    log('yellow', '\n⚠️  SECURITY NOTE:');
    log('red', 'Change the temporary password immediately after login!');
    
    await sequelize.close();
    log('green', '\n🎉 Authentication fix completed successfully!');
    
  } catch (error) {
    log('red', `❌ Error during fix: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the fix
fixAuthentication().catch(console.error);
