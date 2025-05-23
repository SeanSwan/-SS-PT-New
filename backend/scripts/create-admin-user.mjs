// backend/scripts/create-admin-user.mjs
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
 * Creates an admin user directly using the Sequelize model
 * This bypasses the Sequelize CLI seeder
 */
async function createAdminUser() {
  try {
    console.log('----- Admin User Creation Script -----');
    
    // 1. Test database connection
    console.log('1. Testing database connection...');
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');
    } catch (error) {
      console.error(`❌ Unable to connect to the database: ${error.message}`);
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    // 2. Check if admin user already exists
    console.log('2. Checking for existing admin user...');
    const existingAdmin = await User.findOne({ where: { username: 'admin' } });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log('   Skipping admin user creation.');
    } else {
      // 3. Create admin user if it doesn't exist
      console.log('3. Creating admin user...');
      
      // Generate UUID
      const userId = uuidv4();
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('55555', salt);
      
      // Create admin user
      const admin = await User.create({
        id: userId,
        username: 'admin',
        email: 'admin@swanstudios.com',
        password: hashedPassword, // Password will be re-hashed by the User model hooks
        firstName: 'Admin',
        lastName: 'User',
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
      
      console.log('✅ Admin user created successfully!');
      console.log(`   ID: ${admin.id}`);
      console.log(`   Username: admin`);
      console.log(`   Password: 55555`);
    }
    
    console.log('----- Admin User Creation Complete -----');
    console.log('');
    console.log('You can now log in with:');
    console.log('Username: admin');
    console.log('Password: 55555');
    
  } catch (error) {
    console.error(`❌ Admin user creation failed: ${error.message}`);
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

// Execute the admin user creation
createAdminUser().catch(error => {
  console.error(`Fatal error during admin user creation: ${error.message}`);
  process.exit(1);
});
