/**
 * Clear Database Locks Script
 *
 * Terminates stuck database sessions that are blocking inserts
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

async function clearLocks() {
  try {
    console.log('🔍 Checking for blocked queries...\n');
    await sequelize.authenticate();

    // Find blocking queries
    const [blockingQueries] = await sequelize.query(`
      SELECT
        blocked_locks.pid AS blocked_pid,
        blocked_activity.usename AS blocked_user,
        blocking_locks.pid AS blocking_pid,
        blocking_activity.usename AS blocking_user,
        blocked_activity.query AS blocked_statement,
        blocking_activity.query AS blocking_statement,
        blocking_activity.state AS blocking_state
      FROM pg_catalog.pg_locks blocked_locks
      JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
      JOIN pg_catalog.pg_locks blocking_locks
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
      JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
      WHERE NOT blocked_locks.granted;
    `);

    if (blockingQueries.length === 0) {
      console.log('✅ No blocked queries found!\n');
      return;
    }

    console.log(`⚠️  Found ${blockingQueries.length} blocking queries:\n`);

    const pidsToTerminate = new Set();

    blockingQueries.forEach((row, index) => {
      console.log(`${index + 1}. Blocking PID: ${row.blocking_pid} (${row.blocking_state})`);
      console.log(`   Blocked PID: ${row.blocked_pid}`);
      console.log(`   Blocking query: ${row.blocking_statement?.substring(0, 100)}...`);
      console.log(`   Blocked query: ${row.blocked_statement?.substring(0, 100)}...\n`);

      pidsToTerminate.add(row.blocking_pid);
      pidsToTerminate.add(row.blocked_pid);
    });

    console.log(`🔫 Terminating ${pidsToTerminate.size} processes...\n`);

    for (const pid of pidsToTerminate) {
      try {
        await sequelize.query(`SELECT pg_terminate_backend(${pid});`);
        console.log(`✅ Terminated PID ${pid}`);
      } catch (error) {
        console.log(`⚠️  Could not terminate PID ${pid}: ${error.message}`);
      }
    }

    console.log('\n🎉 Database locks cleared!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

clearLocks();
