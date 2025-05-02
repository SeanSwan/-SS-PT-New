// backend/scripts/reset-admin-password.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Get directory name equivalent in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(rootDir, '..');

// Load the .env file from the project root directory
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}`);
  dotenv.config(); // Try default location as a last resort
}

// Import database and User model
import sequelize from '../database.mjs';
import User from '../models/User.mjs';

/**
 * Resets the admin user password to a known value
 */
async function resetAdminPassword() {
  try {
    console.log('----- Admin Password Reset Script -----');
    
    // 1. Test database connection
    console.log('1. Testing database connection...');
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
    } catch (error) {
      console.error(`❌ Unable to connect to the database: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // 2. Find admin users
    console.log('2. Looking for admin users...');
    const adminUsers = await User.findAll({
      where: { role: 'admin' }
    });
    
    if (adminUsers.length === 0) {
      console.warn('❌ No admin users found in the database!');
      console.log('Please run the fix-admin script to create an admin user first.');
      return;
    }
    
    console.log(`Found ${adminUsers.length} admin users:`);
    for (const user of adminUsers) {
      console.log(`- ${user.username} (${user.email})`);
    }
    
    // 3. Reset password for each admin user
    console.log('3. Resetting admin passwords...');
    
    // Define a simple, known password - this will be the new admin password
    const NEW_PASSWORD = 'admin123';
    
    // Generate password hash
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, salt);
    
    // Update each admin user
    for (const user of adminUsers) {
      await user.update({ password: passwordHash });
      console.log(`✅ Reset password for admin user: ${user.username}`);
      console.log(`   New password is: '${NEW_PASSWORD}'`);
    }
    
    console.log('\n✅ Admin password reset completed successfully!');
    console.log(`Use these credentials to log in:`);
    for (const user of adminUsers) {
      console.log(`Username: ${user.username}`);
      console.log(`Password: ${NEW_PASSWORD}`);
      console.log('---');
    }
    
    console.log('----- Admin Password Reset Complete -----');
    
  } catch (error) {
    console.error(`❌ Admin password reset failed: ${error.message}`);
    if (error.stack) {
      console.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  } finally {
    // Close the database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
}

// Execute the admin password reset
resetAdminPassword().catch(error => {
  console.error(`Fatal error during admin password reset: ${error.message}`);
  process.exit(1);
});
