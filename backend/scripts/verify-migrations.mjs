/**
 * Migration Verification Script
 * Checks which migrations have been run and which are pending
 * Verifies database schema completeness
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

async function verifyMigrations() {
  try {
    console.log('🔍 MIGRATION VERIFICATION REPORT');
    console.log('='.repeat(70));
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'Production (Render)' : 'Local'}\n`);

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Check if SequelizeMeta table exists
    const [metaTableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'SequelizeMeta'
      ) as exists;
    `);

    if (!metaTableExists[0].exists) {
      console.log('❌ SequelizeMeta table not found!');
      console.log('   No migrations have been run yet.');
      console.log('   Run: npx sequelize-cli db:migrate\n');
      process.exit(1);
    }

    // Get list of executed migrations
    const [executedMigrations] = await sequelize.query(`
      SELECT name FROM "SequelizeMeta" ORDER BY name;
    `);

    // Get list of migration files
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.cjs') || file.endsWith('.mjs') || file.endsWith('.js'))
      .sort();

    console.log('📋 MIGRATION STATUS');
    console.log('='.repeat(70));

    const executedNames = executedMigrations.map(m => m.name);
    const pendingMigrations = [];
    const completedMigrations = [];

    migrationFiles.forEach(file => {
      const isExecuted = executedNames.includes(file);
      if (isExecuted) {
        completedMigrations.push(file);
        console.log(`✅ ${file}`);
      } else {
        pendingMigrations.push(file);
        console.log(`⏳ ${file} - PENDING`);
      }
    });

    console.log('\n' + '='.repeat(70));
    console.log(`📊 Summary: ${completedMigrations.length} completed, ${pendingMigrations.length} pending`);
    console.log('='.repeat(70));

    // Check for critical tables that should exist
    console.log('\n🏗️  CRITICAL TABLE VERIFICATION');
    console.log('='.repeat(70));

    const criticalTables = [
      { name: 'Users', requiredFor: 'User authentication and accounts' },
      { name: 'sessions', requiredFor: 'Training session bookings' },
      { name: 'storefront_items', requiredFor: 'Session packages/products' },
      { name: 'shopping_carts', requiredFor: 'Shopping cart functionality' },
      { name: 'cart_items', requiredFor: 'Cart items management' },
      { name: 'orders', requiredFor: 'Order processing' },
      { name: 'order_items', requiredFor: 'Order details' },
      { name: 'clients_pii', requiredFor: 'Client personal information (HIPAA compliance)' },
      { name: 'client_trainer_assignments', requiredFor: 'Client-trainer relationships' }
    ];

    const missingTables = [];
    const existingTables = [];

    for (const table of criticalTables) {
      const [exists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = '${table.name}'
        ) as exists;
      `);

      if (exists[0].exists) {
        existingTables.push(table);
        console.log(`✅ ${table.name.padEnd(35)} - ${table.requiredFor}`);
      } else {
        missingTables.push(table);
        console.log(`❌ ${table.name.padEnd(35)} - ${table.requiredFor}`);
      }
    }

    // Show pending migrations that would create missing tables
    if (pendingMigrations.length > 0) {
      console.log('\n⏳ PENDING MIGRATIONS TO RUN:');
      console.log('='.repeat(70));
      pendingMigrations.forEach(migration => {
        console.log(`   - ${migration}`);
      });
      console.log('\n   Run this command to execute pending migrations:');
      console.log('   npx sequelize-cli db:migrate --config config/config.cjs --migrations-path migrations --models-path models --env production\n');
    }

    // Check for foreign key constraints
    console.log('\n🔗 FOREIGN KEY CONSTRAINT CHECK');
    console.log('='.repeat(70));

    const [constraints] = await sequelize.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name;
    `);

    console.log(`Found ${constraints.length} foreign key constraints`);

    // Check for broken foreign keys (referencing non-existent tables)
    const brokenConstraints = [];
    for (const constraint of constraints) {
      const [foreignTableExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = '${constraint.foreign_table_name}'
        ) as exists;
      `);

      if (!foreignTableExists[0].exists) {
        brokenConstraints.push(constraint);
      }
    }

    if (brokenConstraints.length > 0) {
      console.log('\n⚠️  BROKEN FOREIGN KEY CONSTRAINTS:');
      brokenConstraints.forEach(c => {
        console.log(`   ${c.table_name}.${c.column_name} -> ${c.foreign_table_name}.${c.foreign_column_name}`);
      });
    } else {
      console.log('✅ All foreign key constraints are valid');
    }

    // Final recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('='.repeat(70));

    if (missingTables.length > 0) {
      console.log('⚠️  CRITICAL: Missing tables detected!');
      console.log(`   ${missingTables.length} critical table(s) are missing.\n`);
      console.log('   Action Required:');
      console.log('   1. Run pending migrations to create missing tables');
      console.log('   2. Verify migrations complete successfully');
      console.log('   3. Re-run this script to confirm all tables exist\n');
    }

    if (pendingMigrations.length > 0) {
      console.log(`⏳ You have ${pendingMigrations.length} pending migration(s)`);
      console.log('   Run migrations to bring database up to date.\n');
    }

    if (missingTables.length === 0 && pendingMigrations.length === 0) {
      console.log('✅ DATABASE IS FULLY MIGRATED');
      console.log('   All critical tables exist and migrations are up to date.\n');
    }

    // Show storage info
    const [dbSize] = await sequelize.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size;
    `);
    console.log(`💾 Database Size: ${dbSize[0].size}`);

    await sequelize.close();
    console.log('\n✅ Verification complete\n');

    // Exit with error code if there are issues
    if (missingTables.length > 0 || pendingMigrations.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyMigrations()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
