/**
 * Verify Client Tables Script
 *
 * Checks if the 5 client_* tables exist in the database
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Create Sequelize connection
const sequelize = new Sequelize(
  process.env.PG_DB || 'swanstudios',
  process.env.PG_USER || 'swanadmin',
  process.env.PG_PASSWORD || 'postgres',
  {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function verifyTables() {
  try {
    console.log('🔍 Verifying client_* tables in database...\n');
    await sequelize.authenticate();

    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'client_%'
      ORDER BY table_name;
    `);

    const expectedTables = [
      'client_baseline_measurements',
      'client_notes',
      'client_nutrition_plans',
      'client_onboarding_questionnaires',
      'client_photos'
    ];

    console.log('📋 Expected tables:');
    expectedTables.forEach(table => console.log(`   - ${table}`));

    console.log('\n✅ Found tables:');
    tables.forEach(row => console.log(`   - ${row.table_name}`));

    const foundTableNames = tables.map(row => row.table_name);
    const missingTables = expectedTables.filter(table => !foundTableNames.includes(table));

    if (missingTables.length > 0) {
      console.log('\n❌ Missing tables:');
      missingTables.forEach(table => console.log(`   - ${table}`));
      console.log('\n⚠️  Phase 0.2 INCOMPLETE - Some tables missing!');
      process.exit(1);
    } else {
      console.log('\n🎉 Phase 0.2 COMPLETE - All 5 client_* tables exist!');

      // Get row counts
      console.log('\n📊 Table row counts:');
      for (const table of expectedTables) {
        const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table};`);
        console.log(`   ${table}: ${result[0].count} rows`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

verifyTables();
