#!/usr/bin/env node
/**
 * cleanup-test-users.mjs
 * ======================
 * Deletes all users except:
 * - ID 2: Sean (admin)
 * - ID 5: Jasmine Swan / Jazzy (admin)
 *
 * Modes:
 *   DRY RUN (default): Shows what would be deleted without making changes.
 *   EXECUTE: Pass --execute flag to actually perform deletions.
 *
 * Usage:
 *   # Dry run (safe, no changes):
 *   ALLOW_PROD_CLEANUP=true DATABASE_URL=... node backend/scripts/cleanup-test-users.mjs
 *
 *   # Actually delete:
 *   ALLOW_PROD_CLEANUP=true DATABASE_URL=... node backend/scripts/cleanup-test-users.mjs --execute
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

const KEEP_IDS = [2, 5];

const isDryRun = !process.argv.includes('--execute');

async function tryDelete(table, col, ids) {
  const t = await sequelize.transaction();
  try {
    if (isDryRun) {
      const [countResult] = await sequelize.query(
        'SELECT COUNT(*) as count FROM "' + table + '" WHERE "' + col + '" IN (:ids)',
        { replacements: { ids }, transaction: t }
      );
      const count = parseInt(countResult[0]?.count, 10) || 0;
      await t.rollback();
      if (count > 0) {
        console.log('  [DRY RUN] ' + table + '.' + col + ': would delete ' + count + ' rows');
      }
      return;
    }
    const result = await sequelize.query(
      'DELETE FROM "' + table + '" WHERE "' + col + '" IN (:ids)',
      { replacements: { ids }, transaction: t }
    );
    const count = result[1]?.rowCount || 0;
    await t.commit();
    if (count > 0) {
      console.log('  ' + table + '.' + col + ': ' + count + ' rows');
    }
  } catch (err) {
    await t.rollback();
    // Silently skip tables that don't exist or have wrong column names
  }
}

async function trySubqueryDelete(childTable, childCol, parentTable, parentCol, ids) {
  const t = await sequelize.transaction();
  try {
    if (isDryRun) {
      const [countResult] = await sequelize.query(
        'SELECT COUNT(*) as count FROM "' + childTable + '" WHERE "' + childCol + '" IN (SELECT id FROM "' + parentTable + '" WHERE "' + parentCol + '" IN (:ids))',
        { replacements: { ids }, transaction: t }
      );
      const count = parseInt(countResult[0]?.count, 10) || 0;
      await t.rollback();
      if (count > 0) {
        console.log('  [DRY RUN] ' + childTable + ' via ' + parentTable + ': would delete ' + count + ' rows');
      }
      return;
    }
    await sequelize.query(
      'DELETE FROM "' + childTable + '" WHERE "' + childCol + '" IN (SELECT id FROM "' + parentTable + '" WHERE "' + parentCol + '" IN (:ids))',
      { replacements: { ids }, transaction: t }
    );
    await t.commit();
    console.log('  ' + childTable + ' via ' + parentTable + ': done');
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

    // Get users to delete
    const [usersToDelete] = await sequelize.query(
      'SELECT id, "firstName", "lastName", email, role FROM "Users" WHERE id NOT IN (:keepIds)',
      { replacements: { keepIds: KEEP_IDS } }
    );
    console.log('Users to DELETE (' + usersToDelete.length + '):');
    for (const u of usersToDelete) {
      console.log('  ID ' + u.id + ': ' + u.firstName + ' ' + u.lastName + ' (' + u.email + ') [' + u.role + ']');
    }

    const deleteIds = usersToDelete.map(u => u.id);
    if (deleteIds.length === 0) {
      console.log('\nNo users to delete.');
      return;
    }

    const clientIdStrings = deleteIds.map(id => 'PT-' + String(id).padStart(5, '0'));

    console.log('\nClearing dependent records...');

    // Subquery deletions first (child tables that reference parent tables that reference users)
    await trySubqueryDelete('order_items', 'orderId', 'orders', 'userId', deleteIds);
    await trySubqueryDelete('cart_items', 'cartId', 'shopping_carts', 'userId', deleteIds);

    // All FK references — each runs in its own transaction to avoid cascade abort
    const deletions = [
      // PascalCase tables (Sequelize auto-created)
      ['PointTransactions', 'userId', deleteIds],
      ['ChallengeParticipants', 'userId', deleteIds],
      ['UserAchievements', 'userId', deleteIds],
      ['UserBadges', 'userId', deleteIds],
      ['UserMilestones', 'userId', deleteIds],
      ['UserRewards', 'userId', deleteIds],
      ['WorkoutSessions', 'userId', deleteIds],
      ['WorkoutPlans', 'userId', deleteIds],
      ['Gamifications', 'userId', deleteIds],
      ['SocialComments', 'userId', deleteIds],
      ['SocialLikes', 'userId', deleteIds],
      ['SocialPosts', 'userId', deleteIds],
      ['EnhancedSocialPosts', 'userId', deleteIds],
      // snake_case tables (migration-created)
      ['notifications', 'userId', deleteIds],
      ['sessions', 'userId', deleteIds],
      ['sessions', 'trainerId', deleteIds],
      ['orders', 'userId', deleteIds],
      ['daily_workout_forms', 'client_id', deleteIds],
      ['daily_workout_forms', 'trainer_id', deleteIds],
      ['client_progress', 'userId', deleteIds],
      ['client_trainer_assignments', 'clientId', deleteIds],
      ['client_trainer_assignments', 'trainerId', deleteIds],
      ['client_notes', 'userId', deleteIds],
      ['client_nutrition_plans', 'userId', deleteIds],
      ['client_onboarding_questionnaires', 'userId', deleteIds],
      ['client_photos', 'userId', deleteIds],
      ['client_baseline_measurements', 'userId', deleteIds],
      ['client_opt_phases', 'client_id', deleteIds],
      ['body_measurements', 'userId', deleteIds],
      ['food_scan_history', 'userId', deleteIds],
      ['measurement_milestones', 'userId', deleteIds],
      ['orientations', 'userId', deleteIds],
      ['renewal_alerts', 'userId', deleteIds],
      ['shopping_carts', 'userId', deleteIds],
      ['contacts', 'userId', deleteIds],
      ['automation_logs', 'userId', deleteIds],
      ['trainer_availability', 'trainer_id', deleteIds],
      ['trainer_certifications', 'trainer_id', deleteIds],
      ['trainer_commissions', 'trainer_id', deleteIds],
      ['trainer_commissions', 'client_id', deleteIds],
      ['trainer_permissions', 'trainerId', deleteIds],
      ['conversation_participants', 'user_id', deleteIds],
      ['message_receipts', 'user_id', deleteIds],
      ['corrective_homework_logs', 'client_id', deleteIds],
      ['corrective_protocols', 'client_id', deleteIds],
      ['movement_assessments', 'client_id', deleteIds],
      ['phase_progression_history', 'client_id', deleteIds],
      ['session_logs', 'client_id', deleteIds],
      ['session_logs', 'trainer_id', deleteIds],
      ['progress_reports', 'userId', deleteIds],
      ['video_analytics', 'user_id', deleteIds],
      ['workout_templates', 'userId', deleteIds],
      ['clients_pii', 'client_id', clientIdStrings],
    ];

    for (const [table, col, ids] of deletions) {
      await tryDelete(table, col, ids);
    }

    if (isDryRun) {
      // Dry-run: just report what would happen to the Users table
      console.log('\n[DRY RUN] Would delete ' + deleteIds.length + ' users from "Users" table.');
      const [remaining] = await sequelize.query(
        'SELECT id, "firstName", "lastName", email, role FROM "Users" WHERE id IN (:keepIds) ORDER BY id ASC',
        { replacements: { keepIds: KEEP_IDS } }
      );
      console.log('\n=== USERS THAT WOULD REMAIN ===');
      for (const u of remaining) {
        console.log('  ID ' + u.id + ': ' + u.firstName + ' ' + u.lastName + ' (' + u.email + ') [' + u.role + ']');
      }
      console.log('Total would remain: ' + remaining.length);
      console.log('\nDry run complete. No data was modified.');
      console.log('Run with --execute to perform actual deletion.');
    } else {
      // Backup users before deletion
      console.log('\nCreating backup of users to be deleted...');
      try {
        // Drop existing backup table if it exists, then recreate
        await sequelize.query('DROP TABLE IF EXISTS backup_deleted_users');
        await sequelize.query(
          'CREATE TABLE backup_deleted_users AS SELECT * FROM "Users" WHERE id NOT IN (:keepIds)',
          { replacements: { keepIds: KEEP_IDS } }
        );
        console.log('  Backup created: backup_deleted_users');
      } catch (err) {
        console.log('  Backup note:', err.message);
      }

      // Now delete the users
      console.log('\nDeleting ' + deleteIds.length + ' users...');
      const t = await sequelize.transaction();
      try {
        const [, deleteResult] = await sequelize.query(
          'DELETE FROM "Users" WHERE id IN (:ids)',
          { replacements: { ids: deleteIds }, transaction: t }
        );
        console.log('Deleted ' + (deleteResult?.rowCount || deleteIds.length) + ' users.');

        const [remaining] = await sequelize.query(
          'SELECT id, "firstName", "lastName", email, role FROM "Users" ORDER BY id ASC',
          { transaction: t }
        );
        console.log('\n=== REMAINING USERS ===');
        for (const u of remaining) {
          console.log('  ID ' + u.id + ': ' + u.firstName + ' ' + u.lastName + ' (' + u.email + ') [' + u.role + ']');
        }
        console.log('Total remaining: ' + remaining.length);

        await t.commit();
        console.log('\nCleanup committed successfully.');
      } catch (err) {
        await t.rollback();
        console.error('\nFailed to delete users:', err.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

cleanup();
