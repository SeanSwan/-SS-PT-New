#!/usr/bin/env node
/**
 * cleanup-qa-and-sessions.mjs
 * ===========================
 * Deletes:
 *   1. All QA/Style Audit users (email LIKE '%@swanstudios-qa.local')
 *   2. ALL sessions from the sessions table
 *
 * Modes:
 *   DRY RUN (default): Shows what would be deleted.
 *   EXECUTE: Pass --execute flag to actually delete.
 *
 * Usage:
 *   # Dry run:
 *   ALLOW_PROD_CLEANUP=true DATABASE_URL=... node backend/scripts/cleanup-qa-and-sessions.mjs
 *
 *   # Execute:
 *   ALLOW_PROD_CLEANUP=true DATABASE_URL=... node backend/scripts/cleanup-qa-and-sessions.mjs --execute
 */
import { Sequelize } from 'sequelize';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const isProduction = DATABASE_URL.includes('render.com') || DATABASE_URL.includes('amazonaws.com');
if (isProduction && process.env.ALLOW_PROD_CLEANUP !== 'true') {
  console.error('\nPRODUCTION DB detected. Set ALLOW_PROD_CLEANUP=true to proceed.\n');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: isProduction ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  logging: false
});

const isDryRun = !process.argv.includes('--execute');

async function tryDelete(table, col, ids) {
  if (!ids || ids.length === 0) return;
  const t = await sequelize.transaction();
  try {
    if (isDryRun) {
      const [countResult] = await sequelize.query(
        `SELECT COUNT(*) as count FROM "${table}" WHERE "${col}" IN (:ids)`,
        { replacements: { ids }, transaction: t }
      );
      const count = parseInt(countResult[0]?.count, 10) || 0;
      await t.rollback();
      if (count > 0) {
        console.log(`  [DRY RUN] ${table}.${col}: would delete ${count} rows`);
      }
      return;
    }
    const result = await sequelize.query(
      `DELETE FROM "${table}" WHERE "${col}" IN (:ids)`,
      { replacements: { ids }, transaction: t }
    );
    const count = result[1]?.rowCount || 0;
    await t.commit();
    if (count > 0) {
      console.log(`  ${table}.${col}: ${count} rows deleted`);
    }
  } catch (err) {
    await t.rollback();
    // Skip tables that don't exist
  }
}

async function trySubqueryDelete(childTable, childCol, parentTable, parentCol, ids) {
  if (!ids || ids.length === 0) return;
  const t = await sequelize.transaction();
  try {
    if (isDryRun) {
      const [countResult] = await sequelize.query(
        `SELECT COUNT(*) as count FROM "${childTable}" WHERE "${childCol}" IN (SELECT id FROM "${parentTable}" WHERE "${parentCol}" IN (:ids))`,
        { replacements: { ids }, transaction: t }
      );
      const count = parseInt(countResult[0]?.count, 10) || 0;
      await t.rollback();
      if (count > 0) {
        console.log(`  [DRY RUN] ${childTable} via ${parentTable}: would delete ${count} rows`);
      }
      return;
    }
    const result = await sequelize.query(
      `DELETE FROM "${childTable}" WHERE "${childCol}" IN (SELECT id FROM "${parentTable}" WHERE "${parentCol}" IN (:ids))`,
      { replacements: { ids }, transaction: t }
    );
    await t.commit();
    console.log(`  ${childTable} via ${parentTable}: done`);
  } catch (err) {
    await t.rollback();
  }
}

async function cleanup() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.\n');

    if (isDryRun) {
      console.log('=== DRY RUN MODE (default) ===');
      console.log('No data will be deleted. Pass --execute to actually delete.\n');
    } else {
      console.log('=== EXECUTE MODE ===');
      console.log('Data WILL be permanently deleted!\n');
    }

    // ── Part 1: Find QA users ──────────────────────────────────────
    const [qaUsers] = await sequelize.query(
      `SELECT id, "firstName", "lastName", email, role FROM "Users" WHERE email LIKE '%@swanstudios-qa.local' ORDER BY id`
    );
    console.log(`QA/Style Audit users found: ${qaUsers.length}`);
    for (const u of qaUsers) {
      console.log(`  ID ${u.id}: ${u.firstName} ${u.lastName} (${u.email}) [${u.role}]`);
    }

    const qaIds = qaUsers.map(u => u.id);

    // ── Part 2: Count all sessions ─────────────────────────────────
    const [sessionCount] = await sequelize.query(
      'SELECT COUNT(*) as count FROM "sessions"'
    );
    const totalSessions = parseInt(sessionCount[0]?.count, 10) || 0;
    console.log(`\nTotal sessions in database: ${totalSessions}`);

    if (qaIds.length === 0 && totalSessions === 0) {
      console.log('\nNothing to clean up.');
      return;
    }

    // ── Part 3: Clear QA user dependencies ─────────────────────────
    if (qaIds.length > 0) {
      console.log('\nClearing QA user dependent records...');

      // Subquery deletions (child tables)
      await trySubqueryDelete('order_items', 'orderId', 'orders', 'userId', qaIds);
      await trySubqueryDelete('cart_items', 'cartId', 'shopping_carts', 'userId', qaIds);

      // Direct FK deletions
      const deletions = [
        ['PointTransactions', 'userId'],
        ['ChallengeParticipants', 'userId'],
        ['UserAchievements', 'userId'],
        ['UserBadges', 'userId'],
        ['UserMilestones', 'userId'],
        ['UserRewards', 'userId'],
        ['WorkoutSessions', 'userId'],
        ['WorkoutPlans', 'userId'],
        ['Gamifications', 'userId'],
        ['SocialComments', 'userId'],
        ['SocialLikes', 'userId'],
        ['SocialPosts', 'userId'],
        ['EnhancedSocialPosts', 'userId'],
        ['notifications', 'userId'],
        ['sessions', 'userId'],
        ['sessions', 'trainerId'],
        ['orders', 'userId'],
        ['daily_workout_forms', 'client_id'],
        ['daily_workout_forms', 'trainer_id'],
        ['client_progress', 'userId'],
        ['client_trainer_assignments', 'clientId'],
        ['client_trainer_assignments', 'trainerId'],
        ['client_notes', 'userId'],
        ['client_nutrition_plans', 'userId'],
        ['client_onboarding_questionnaires', 'userId'],
        ['client_photos', 'userId'],
        ['client_baseline_measurements', 'userId'],
        ['body_measurements', 'userId'],
        ['food_scan_history', 'userId'],
        ['orientations', 'userId'],
        ['renewal_alerts', 'userId'],
        ['shopping_carts', 'userId'],
        ['contacts', 'userId'],
        ['automation_logs', 'userId'],
        ['trainer_availability', 'trainer_id'],
        ['trainer_certifications', 'trainer_id'],
        ['trainer_commissions', 'trainer_id'],
        ['trainer_commissions', 'client_id'],
        ['trainer_permissions', 'trainerId'],
        ['conversation_participants', 'user_id'],
        ['message_receipts', 'user_id'],
        ['progress_reports', 'userId'],
        ['video_analytics', 'user_id'],
        ['workout_templates', 'userId'],
      ];

      for (const [table, col] of deletions) {
        await tryDelete(table, col, qaIds);
      }

      // Delete QA users
      if (isDryRun) {
        console.log(`\n[DRY RUN] Would delete ${qaIds.length} QA users from "Users" table.`);
      } else {
        const t = await sequelize.transaction();
        try {
          const [, result] = await sequelize.query(
            'DELETE FROM "Users" WHERE id IN (:ids)',
            { replacements: { ids: qaIds }, transaction: t }
          );
          await t.commit();
          console.log(`\nDeleted ${result?.rowCount || qaIds.length} QA users.`);
        } catch (err) {
          await t.rollback();
          console.error('Failed to delete QA users:', err.message);
        }
      }
    }

    // ── Part 4: Clear ALL sessions ─────────────────────────────────
    if (totalSessions > 0) {
      console.log(`\nClearing ALL ${totalSessions} sessions...`);
      if (isDryRun) {
        console.log(`[DRY RUN] Would delete ${totalSessions} rows from "sessions" table.`);
      } else {
        const t = await sequelize.transaction();
        try {
          const [, result] = await sequelize.query(
            'DELETE FROM "sessions"',
            { transaction: t }
          );
          await t.commit();
          console.log(`Deleted ${result?.rowCount || totalSessions} sessions.`);
        } catch (err) {
          await t.rollback();
          console.error('Failed to delete sessions:', err.message);
        }
      }
    }

    // ── Summary ────────────────────────────────────────────────────
    const [remainingUsers] = await sequelize.query(
      'SELECT id, "firstName", "lastName", email, role FROM "Users" ORDER BY id ASC'
    );
    const [remainingSessions] = await sequelize.query(
      'SELECT COUNT(*) as count FROM "sessions"'
    );

    console.log('\n=== REMAINING STATE ===');
    console.log(`Users (${remainingUsers.length}):`);
    for (const u of remainingUsers) {
      console.log(`  ID ${u.id}: ${u.firstName} ${u.lastName} (${u.email}) [${u.role}]`);
    }
    console.log(`Sessions: ${remainingSessions[0]?.count || 0}`);

    if (isDryRun) {
      console.log('\nDry run complete. No data was modified.');
      console.log('Run with --execute to perform actual deletion.');
    } else {
      console.log('\nCleanup complete.');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

cleanup();
