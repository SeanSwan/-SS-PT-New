/**
 * Skip Fix Migrations Script
 *
 * Marks the 3 UUID fix migrations as executed without running them,
 * since we've already fixed the source migrations directly.
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
    logging: console.log
  }
);

async function skipFixMigrations() {
  try {
    console.log('🔧 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const migrationsToSkip = [
      'DIRECT-FOREIGN-KEY-CONSTRAINT-FIX.cjs',
      'EMERGENCY-DATABASE-REPAIR.cjs',
      'UUID-INTEGER-TYPE-MISMATCH-FIX.cjs'
    ];

    console.log('\n📋 Marking fix migrations as executed...');

    for (const migration of migrationsToSkip) {
      const [results, metadata] = await sequelize.query(`
        INSERT INTO "SequelizeMeta" (name)
        VALUES (:name)
        ON CONFLICT (name) DO NOTHING
        RETURNING *;
      `, {
        replacements: { name: migration }
      });

      if (results.length > 0) {
        console.log(`✅ Marked as executed: ${migration}`);
      } else {
        console.log(`⏭️  Already executed: ${migration}`);
      }
    }

    console.log('\n🎉 All fix migrations skipped successfully!');
    console.log('\n📝 Next step: Run "npm run migrate" to execute remaining migrations\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

skipFixMigrations();
