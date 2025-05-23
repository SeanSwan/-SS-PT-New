// backend/scripts/fix-admin-user.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

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
  // Fallback to the backend directory .env if it exists
  const backendEnvPath = path.resolve(rootDir, '.env');
  if (fs.existsSync(backendEnvPath)) {
    console.log(`Loading environment variables from: ${backendEnvPath}`);
    dotenv.config({ path: backendEnvPath });
  } else {
    console.warn('Warning: No .env file found. Using default environment variables.');
    dotenv.config(); // Try default location as a last resort
  }
}

// Import database and User model
import sequelize from '../database.mjs';
import User from '../models/User.mjs';

/**
 * Fixes admin user credentials by ensuring:
 * 1. First we try to find and update the existing admin user
 * 2. If no admin user exists, we create a new one with appropriate credentials
 * 3. If multiple admin users exist, we fix all of them
 */
async function fixAdminUser() {
  try {
    console.log('----- Admin User Fix Script -----');
    
    // 1. Test database connection
    console.log('1. Testing database connection...');
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
    } catch (error) {
      console.error(`❌ Unable to connect to the database: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // 2. Find all admin users
    console.log('2. Searching for admin users...');
    const adminUsers = await User.findAll({ where: { role: 'admin' } });
    
    // 3. Process admin users based on what we find
    if (adminUsers.length === 0) {
      console.log('   No admin users found. Creating a new admin user...');
      
      // Create admin with values from .env file
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || '55555';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@swanstudios.com';
      const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
      const adminLastName = process.env.ADMIN_LAST_NAME || 'User';
      
      // Hash password (do it manually to bypass model hooks)
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);
      
      // Create admin user
      const admin = await User.create({
        id: uuidv4(),
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword, // Manually hashed to bypass model hooks
        firstName: adminFirstName,
        lastName: adminLastName,
        role: 'admin',
        isActive: true,
        emailNotifications: true,
        smsNotifications: true,
        preferences: JSON.stringify({
          theme: 'dark',
          language: 'en',
          dashboardLayout: 'default'
        })
      });
      
      console.log('✅ New admin user created successfully!');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Username: ${adminUsername}`);
      console.log(`   Password: ${adminPassword}`);
    } else {
      console.log(`   Found ${adminUsers.length} admin users. Fixing credentials...`);
      
      // Process each admin user
      for (const adminUser of adminUsers) {
        console.log(`   Processing admin user: ${adminUser.username} (ID: ${adminUser.id})`);
        
        // Create new credentials from .env file, or default to "admin/55555"
        const defaultUsername = adminUser.username === 'admin' ? 'admin' : adminUser.username;
        const adminUsername = process.env.ADMIN_USERNAME || defaultUsername;
        const adminPassword = process.env.ADMIN_PASSWORD || '55555';
        const adminEmail = process.env.ADMIN_EMAIL || adminUser.email || 'admin@swanstudios.com';
        const adminFirstName = process.env.ADMIN_FIRST_NAME || adminUser.firstName || 'Admin';
        const adminLastName = process.env.ADMIN_LAST_NAME || adminUser.lastName || 'User';
        
        // Hash password (doing it manually to bypass model hooks)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(adminPassword, salt);
        
        // Update the admin user
        await adminUser.update({
          username: adminUsername,
          email: adminEmail,
          password: hashedPassword, // Manually hashed password
          firstName: adminFirstName,
          lastName: adminLastName,
          isActive: true
        }, { 
          // Skip hooks to prevent double-hashing
          hooks: false 
        });
        
        console.log(`✅ Admin user updated successfully!`);
        console.log(`   ID: ${adminUser.id}`);
        console.log(`   Username: ${adminUsername}`);
        console.log(`   Password: ${adminPassword}`);
      }
    }
    
    console.log('----- Admin User Fix Complete -----');
    console.log('');
    console.log('You can now log in with:');
    
    // Prioritize .env values if available
    if (process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
      console.log(`Username: ${process.env.ADMIN_USERNAME}`);
      console.log(`Password: ${process.env.ADMIN_PASSWORD}`);
    } else {
      // Fallback to admin/55555
      console.log('Username: admin');
      console.log('Password: 55555');
    }
    
  } catch (error) {
    console.error(`❌ Admin user fix failed: ${error.message}`);
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

// Execute the admin user fix
fixAdminUser().catch(error => {
  console.error(`Fatal error during admin user fix: ${error.message}`);
  process.exit(1);
});
