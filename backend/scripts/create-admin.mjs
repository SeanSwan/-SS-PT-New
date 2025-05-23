/**
 * Create Admin User Script
 * =======================
 * Creates an admin user directly without using seeders
 * Run with: node scripts/create-admin.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Set up proper paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables
dotenv.config({ path: join(rootDir, '.env') });

// Import database and models
import sequelize from '../database.mjs';
import User from '../models/User.mjs';

// Set up constants
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = '55555';
const ADMIN_EMAIL = 'admin@swanstudios.com';

const createAdmin = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established successfully.');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ where: { username: ADMIN_USERNAME } });
    
    if (existingAdmin) {
      console.log(`Admin user '${ADMIN_USERNAME}' already exists with ID: ${existingAdmin.id}`);
      
      // Update password
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await existingAdmin.update({ 
        password: hashedPassword,
        isActive: true
      });
      
      console.log(`Admin password reset to '${ADMIN_PASSWORD}'`);
      return;
    }
    
    // Create new admin user
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    
    const adminUser = await User.create({
      id: uuidv4(),
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      emailNotifications: true,
      smsNotifications: true
    });
    
    console.log(`Admin user created with ID: ${adminUser.id}`);
    console.log(`Username: ${adminUser.username}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('Database connection closed.');
  }
};

// Run the function
createAdmin();
