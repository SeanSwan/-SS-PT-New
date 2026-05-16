/**
 * Ensure Simple Admin Login
 * Creates or updates admin user with simple credentials for easy login
 * Username: admin
 * Password: admin123
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import sequelize from '../database.mjs';
import User from '../models/User.mjs';

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
  dotenv.config();
}

// Simple admin credentials for easy login
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
  email: 'admin@swanstudios.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin'
};

async function ensureSimpleAdmin() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Check if admin user exists
    let user = await User.findOne({
      where: { username: ADMIN_CREDENTIALS.username }
    });

    if (user) {
      // Update existing user - pass plain password, let model hooks hash it
      await user.update({
        password: ADMIN_CREDENTIALS.password,
        role: 'admin',
        isActive: true,
        email: ADMIN_CREDENTIALS.email,
        firstName: ADMIN_CREDENTIALS.firstName,
        lastName: ADMIN_CREDENTIALS.lastName
      });
      console.log('✅ Admin user updated successfully');
    } else {
      // Create new user - pass plain password, let model hooks hash it
      user = await User.create({
        username: ADMIN_CREDENTIALS.username,
        password: ADMIN_CREDENTIALS.password,
        email: ADMIN_CREDENTIALS.email,
        firstName: ADMIN_CREDENTIALS.firstName,
        lastName: ADMIN_CREDENTIALS.lastName,
        role: 'admin',
        isActive: true
      });
      console.log('✅ Admin user created successfully');
    }

    // Refresh user to get hashed password
    await user.reload();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 ADMIN LOGIN CREDENTIALS (FOR DEVELOPMENT):');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Username: ${ADMIN_CREDENTIALS.username}`);
    console.log(`Password: ${ADMIN_CREDENTIALS.password}`);
    console.log(`Role: ${user.role}`);
    console.log(`Email: ${user.email}`);
    console.log(`Active: ${user.isActive}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Test the password
    const isPasswordCorrect = await bcrypt.compare(ADMIN_CREDENTIALS.password, user.password);
    console.log(`Password verification: ${isPasswordCorrect ? '✅ PASS' : '❌ FAIL'}`);

    await sequelize.close();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
console.log('🚀 Ensuring simple admin login credentials...\n');
ensureSimpleAdmin()
  .then(() => {
    console.log('\n✅ Admin setup complete!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed to setup admin:', err);
    process.exit(1);
  });
