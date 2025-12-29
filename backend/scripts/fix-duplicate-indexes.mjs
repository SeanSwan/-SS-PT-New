/**
 * Fix Duplicate Indexes Script
 * =============================
 * Drops all duplicate/conflicting indexes that are preventing migrations from running
 * Run this before attempting to run pending migrations
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

async function fixDuplicateIndexes() {
  try {
    console.log('🔧 FIXING DUPLICATE INDEXES');
    console.log('='.repeat(70));
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'Production (Render)' : 'Local'}\n`);

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get all indexes in the database
    console.log('📋 Finding all indexes in database...');
    const [allIndexes] = await sequelize.query(`
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    console.log(`Found ${allIndexes.length} indexes\n`);

    // Common problematic index patterns from migrations
    const problematicIndexes = [
      // Workout sessions indexes
      'workout_session_user_idx',
      'workout_session_date_idx',
      'workout_session_status_idx',
      'workout_session_plan_idx',
      'workout_session_user_date_idx',

      // Post reports indexes
      'postreport_reporter_idx',
      'postreport_content_idx',
      'postreport_author_idx',
      'postreport_status_idx',
      'postreport_priority_idx',
      'postreport_created_idx',

      // Moderation actions indexes
      'modaction_moderator_idx',
      'modaction_content_idx',
      'modaction_author_idx',
      'modaction_action_idx',
      'modaction_automatic_idx',
      'modaction_created_idx',
      'modaction_report_idx',

      // Any other common patterns
      'idx_users_email',
      'idx_users_username',
      'idx_sessions_user',
      'idx_sessions_date'
    ];

    console.log('🗑️  DROPPING PROBLEMATIC INDEXES');
    console.log('='.repeat(70));

    let droppedCount = 0;
    let notFoundCount = 0;

    for (const indexName of problematicIndexes) {
      try {
        // Check if index exists
        const indexExists = allIndexes.find(idx => idx.indexname === indexName);

        if (indexExists) {
          console.log(`\nDropping: ${indexName} on table ${indexExists.tablename}`);

          await sequelize.query(`DROP INDEX IF EXISTS "${indexName}" CASCADE;`);

          console.log(`✅ Dropped ${indexName}`);
          droppedCount++;
        } else {
          console.log(`⏭️  ${indexName} - not found, skipping`);
          notFoundCount++;
        }
      } catch (error) {
        console.error(`❌ Error dropping ${indexName}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Dropped: ${droppedCount} indexes`);
    console.log(`⏭️  Not found: ${notFoundCount} indexes`);
    console.log(`📋 Total checked: ${problematicIndexes.length} indexes`);

    console.log('\n💡 NEXT STEPS');
    console.log('='.repeat(70));
    console.log('Run migrations again:');
    console.log('npx sequelize-cli db:migrate --config config/config.cjs --migrations-path migrations --models-path models --env production');

    await sequelize.close();
    console.log('\n✅ Index cleanup complete\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixDuplicateIndexes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
