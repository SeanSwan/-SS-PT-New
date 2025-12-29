/**
 * Production Admin Setup Script (Raw SQL Version)
 * Sets up admin user on production database using raw SQL
 * This bypasses Sequelize models to avoid schema mismatch issues
 * Username: admin
 * Password: admin123
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import sequelize from '../database.mjs';

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

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_CREDENTIALS.password, salt);
    console.log('🔐 Password hashed successfully');

    // Check if admin user exists using raw SQL
    const [users] = await sequelize.query(
      'SELECT id, username, email, role FROM "Users" WHERE username = :username LIMIT 1',
      {
        replacements: { username: ADMIN_CREDENTIALS.username },
        type: sequelize.QueryTypes.SELECT
      }
    );

    let result;

    if (users) {
      // Update existing user
      console.log(`📝 Updating existing user: ${users.username}`);

      result = await sequelize.query(
        `UPDATE "Users"
         SET password = :password,
             role = :role,
             "isActive" = true,
             email = :email,
             "firstName" = :firstName,
             "lastName" = :lastName,
             "updatedAt" = NOW()
         WHERE username = :username
         RETURNING id, username, email, role, "isActive"`,
        {
          replacements: {
            password: hashedPassword,
            role: ADMIN_CREDENTIALS.role,
            email: ADMIN_CREDENTIALS.email,
            firstName: ADMIN_CREDENTIALS.firstName,
            lastName: ADMIN_CREDENTIALS.lastName,
            username: ADMIN_CREDENTIALS.username
          },
          type: sequelize.QueryTypes.UPDATE
        }
      );
      console.log('✅ Admin user updated');
    } else {
      // Create new user
      console.log('➕ Creating new admin user...');

      result = await sequelize.query(
        `INSERT INTO "Users"
         (username, password, email, "firstName", "lastName", role, "isActive", "createdAt", "updatedAt")
         VALUES (:username, :password, :email, :firstName, :lastName, :role, true, NOW(), NOW())
         RETURNING id, username, email, role, "isActive"`,
        {
          replacements: {
            username: ADMIN_CREDENTIALS.username,
            password: hashedPassword,
            email: ADMIN_CREDENTIALS.email,
            firstName: ADMIN_CREDENTIALS.firstName,
            lastName: ADMIN_CREDENTIALS.lastName,
            role: ADMIN_CREDENTIALS.role
          },
          type: sequelize.QueryTypes.INSERT
        }
      );
      console.log('✅ Admin user created');
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎉 PRODUCTION ADMIN LOGIN:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Username: ${ADMIN_CREDENTIALS.username}`);
    console.log(`Password: ${ADMIN_CREDENTIALS.password}`);
    console.log(`Role: ${ADMIN_CREDENTIALS.role}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Verify the password works
    const [verifyUser] = await sequelize.query(
      'SELECT password FROM "Users" WHERE username = :username LIMIT 1',
      {
        replacements: { username: ADMIN_CREDENTIALS.username },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (verifyUser) {
      const isMatch = await bcrypt.compare(ADMIN_CREDENTIALS.password, verifyUser.password);
      console.log(`Password verification: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);
    }

    await sequelize.close();
    console.log('\n✅ Complete! You can now login at https://sswanstudios.com/login');

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
