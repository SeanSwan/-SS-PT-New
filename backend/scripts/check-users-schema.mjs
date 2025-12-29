/**
 * Check Users table schema in production
 * Shows what columns actually exist
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
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

async function checkSchema() {
  try {
    console.log('🔍 Checking Users table schema...\n');

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get column information
    const [columns] = await sequelize.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'Users'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Users table columns:\n');
    console.log('Column Name                 | Type              | Nullable | Default');
    console.log('--------------------------- | ----------------- | -------- | -------');

    columns.forEach(col => {
      const name = col.column_name.padEnd(26);
      const type = col.data_type.padEnd(17);
      const nullable = col.is_nullable.padEnd(8);
      const def = col.column_default ? col.column_default.substring(0, 20) : 'NULL';
      console.log(`${name} | ${type} | ${nullable} | ${def}`);
    });

    console.log('\n\n🔍 Checking for admin user...\n');

    const [users] = await sequelize.query(`
      SELECT id, username, email, role, "firstName", "lastName", "isActive"
      FROM "Users"
      WHERE role = 'admin'
      LIMIT 5;
    `);

    if (users.length > 0) {
      console.log('👥 Admin users found:\n');
      users.forEach(user => {
        console.log(`  ID: ${user.id}`);
        console.log(`  Username: ${user.username}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.firstName} ${user.lastName}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Active: ${user.isActive}`);
        console.log('  ---');
      });
    } else {
      console.log('❌ No admin users found');
    }

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
