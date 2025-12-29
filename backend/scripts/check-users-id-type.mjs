/**
 * Check Users Table ID Type
 * ==========================
 * Determines the actual data type of the Users.id column in production
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

async function checkUsersIdType() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get Users table column info
    const [columns] = await sequelize.query(`
      SELECT
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'Users' AND column_name = 'id';
    `);

    console.log('👤 Users.id column information:');
    console.log(columns[0]);

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsersIdType();
