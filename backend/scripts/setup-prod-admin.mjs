/**
 * Production Admin Setup Script
 * Sets up admin user on production database (Render)
 * Username: admin
 * Password: admin123
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sequelize from '../database.mjs';
import User from '../models/User.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '../..');

// Load environment variables
const envPath = path.resolve(projectRootDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Simple admin credentials
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
  email: 'admin@swanstudios.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin'
};

async function setupProdAdmin() {
  try {
    console.log('🚀 Connecting to production database...');
    console.log(`Database: ${process.env.DATABASE_URL ? 'Using DATABASE_URL' : 'Using individual env vars'}`);

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Note: We skip sequelize.sync() in production to avoid schema conflicts
    // The database schema should be managed via migrations instead
    console.log('⏭️  Skipping model sync (use migrations for schema management)');

    // Check if admin user exists
    let user = await User.findOne({
      where: { username: ADMIN_CREDENTIALS.username }
    });

    if (user) {
      // Update existing user
      await user.update({
        password: ADMIN_CREDENTIALS.password, // Model hooks will hash it
        role: 'admin',
        isActive: true,
        email: ADMIN_CREDENTIALS.email,
        firstName: ADMIN_CREDENTIALS.firstName,
        lastName: ADMIN_CREDENTIALS.lastName
      });
      console.log('✅ Admin user updated');
    } else {
      // Create new user
      user = await User.create({
        username: ADMIN_CREDENTIALS.username,
        password: ADMIN_CREDENTIALS.password, // Model hooks will hash it
        email: ADMIN_CREDENTIALS.email,
        firstName: ADMIN_CREDENTIALS.firstName,
        lastName: ADMIN_CREDENTIALS.lastName,
        role: 'admin',
        isActive: true
      });
      console.log('✅ Admin user created');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 PRODUCTION ADMIN LOGIN:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Username: ${ADMIN_CREDENTIALS.username}`);
    console.log(`Password: ${ADMIN_CREDENTIALS.password}`);
    console.log(`Role: ${user.role}`);
    console.log('═══════════════════════════════════════════════════════\n');

    await sequelize.close();
    console.log('✅ Complete! You can now login at https://sswanstudios.com/login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setupProdAdmin()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
