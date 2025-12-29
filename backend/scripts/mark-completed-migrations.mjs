/**
 * Mark Completed Migrations Script
 * ==================================
 * Marks migrations as completed in SequelizeMeta when their changes already exist
 * This handles cases where migrations partially ran and created tables/columns
 * but didn't finish, preventing them from running again
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

async function markCompletedMigrations() {
  try {
    console.log('🔧 MARKING COMPLETED MIGRATIONS');
    console.log('='.repeat(70));
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'Production (Render)' : 'Local'}\n`);

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Get currently executed migrations
    const [executedMigrations] = await sequelize.query(`
      SELECT name FROM "SequelizeMeta" ORDER BY name;
    `);
    const executedNames = executedMigrations.map(m => m.name);

    console.log('📋 Checking migrations that should be marked as completed...\n');

    let markedCount = 0;

    // Migration: 20250814000000-create-content-moderation-system.cjs
    // Check if this migration's work is already done
    const contentModerationMigration = '20250814000000-create-content-moderation-system.cjs';
    if (!executedNames.includes(contentModerationMigration)) {
      // Check if PostReports and ModerationActions tables exist
      const [postReportsExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'PostReports'
        ) as exists;
      `);

      const [moderationActionsExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'ModerationActions'
        ) as exists;
      `);

      // Check if SocialPosts has moderationStatus column
      const [moderationStatusExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'SocialPosts' AND column_name = 'moderationStatus'
        ) as exists;
      `);

      if (postReportsExists[0].exists && moderationActionsExists[0].exists && moderationStatusExists[0].exists) {
        console.log(`✅ Marking ${contentModerationMigration} as completed`);
        console.log('   - PostReports table exists');
        console.log('   - ModerationActions table exists');
        console.log('   - SocialPosts.moderationStatus column exists');

        await sequelize.query(`
          INSERT INTO "SequelizeMeta" (name)
          VALUES (:name)
          ON CONFLICT (name) DO NOTHING;
        `, {
          replacements: { name: contentModerationMigration }
        });

        markedCount++;
      } else {
        console.log(`⏭️  ${contentModerationMigration} - not fully complete, skipping`);
      }
    } else {
      console.log(`⏭️  ${contentModerationMigration} - already marked as executed`);
    }

    // Migration: 20250714000001-create-workout-sessions-table.cjs
    const workoutSessionsMigration = '20250714000001-create-workout-sessions-table.cjs';
    if (!executedNames.includes(workoutSessionsMigration)) {
      const [workoutSessionsExists] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'WorkoutSessions'
        ) as exists;
      `);

      if (workoutSessionsExists[0].exists) {
        console.log(`\n✅ Marking ${workoutSessionsMigration} as completed`);
        console.log('   - WorkoutSessions table exists');

        await sequelize.query(`
          INSERT INTO "SequelizeMeta" (name)
          VALUES (:name)
          ON CONFLICT (name) DO NOTHING;
        `, {
          replacements: { name: workoutSessionsMigration }
        });

        markedCount++;
      }
    } else {
      console.log(`⏭️  ${workoutSessionsMigration} - already marked as executed`);
    }

    // Mark old Knex video library migrations as completed (replaced by Sequelize versions)
    const knexVideoMigrations = [
      '20251113000001-create-exercise-videos-table.cjs',
      '20251113000002-create-video-analytics-table.cjs',
      '20251113000003-add-video-library-to-exercise-library.cjs'
    ];

    console.log('\n🔄 Checking Knex video library migrations (replaced by Sequelize versions)...\n');

    for (const migration of knexVideoMigrations) {
      if (!executedNames.includes(migration)) {
        console.log(`✅ Marking ${migration} as completed (Knex - replaced by 20251118 versions)`);

        await sequelize.query(`
          INSERT INTO "SequelizeMeta" (name)
          VALUES (:name)
          ON CONFLICT (name) DO NOTHING;
        `, {
          replacements: { name: migration }
        });

        markedCount++;
      } else {
        console.log(`⏭️  ${migration} - already marked as executed`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Marked ${markedCount} migration(s) as completed`);

    console.log('\n💡 NEXT STEPS');
    console.log('='.repeat(70));
    console.log('Run migrations again:');
    console.log('npx sequelize-cli db:migrate --config config/config.cjs --migrations-path migrations --models-path models --env production');

    await sequelize.close();
    console.log('\n✅ Migration marking complete\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

markCompletedMigrations()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
