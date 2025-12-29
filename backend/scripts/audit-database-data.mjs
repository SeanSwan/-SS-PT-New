/**
 * Database Data Audit Script
 * Shows what data exists in the production database
 * Verifies data persistence is working correctly
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

async function auditDatabase() {
  try {
    console.log('🔍 DATABASE DATA AUDIT');
    console.log('='.repeat(60));
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'Production (Render)' : 'Local'}\n`);

    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Define tables to check with their importance
    const tables = [
      { name: 'Users', critical: true, description: 'User accounts (clients, trainers, admins)' },
      { name: 'Sessions', critical: true, description: 'Training sessions' },
      { name: 'clients_pii', critical: true, description: 'Client PII data (names, medical info)' },
      { name: 'StorefrontItems', critical: true, description: 'Session packages for sale' },
      { name: 'ShoppingCarts', critical: true, description: 'User shopping carts' },
      { name: 'CartItems', critical: true, description: 'Items in shopping carts' },
      { name: 'Orders', critical: true, description: 'Completed orders' },
      { name: 'OrderItems', critical: true, description: 'Items in orders' },
      { name: 'ClientProgress', critical: false, description: 'Client fitness progress tracking' },
      { name: 'WorkoutPlans', critical: false, description: 'Client workout plans' },
      { name: 'Exercises', critical: false, description: 'Exercise library' },
      { name: 'achievements', critical: false, description: 'Gamification achievements' },
      { name: 'SocialPosts', critical: false, description: 'Social media posts' },
      { name: 'Friendships', critical: false, description: 'Social connections' },
      { name: 'contacts', critical: false, description: 'Contact form submissions' },
      { name: 'client_trainer_assignments', critical: true, description: 'Client-trainer relationships' }
    ];

    console.log('📊 TABLE DATA COUNTS');
    console.log('='.repeat(60));

    let totalRecords = 0;
    const results = [];

    for (const table of tables) {
      try {
        const [count] = await sequelize.query(
          `SELECT COUNT(*) as count FROM "${table.name}"`
        );

        const recordCount = parseInt(count[0].count);
        totalRecords += recordCount;

        const status = table.critical && recordCount === 0 ? '⚠️ ' : recordCount > 0 ? '✅' : '⭕';
        const criticalMark = table.critical ? ' [CRITICAL]' : '';

        results.push({
          table: table.name,
          count: recordCount,
          critical: table.critical,
          description: table.description
        });

        console.log(`${status} ${table.name.padEnd(30)} ${String(recordCount).padStart(6)} records${criticalMark}`);
        console.log(`   ${table.description}`);
      } catch (error) {
        console.log(`❌ ${table.name.padEnd(30)} TABLE NOT FOUND`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📈 TOTAL RECORDS ACROSS ALL TABLES: ${totalRecords}`);
    console.log('='.repeat(60));

    // Check for specific data points
    console.log('\n🔍 DETAILED DATA ANALYSIS');
    console.log('='.repeat(60));

    // Check user distribution
    try {
      const [userRoles] = await sequelize.query(`
        SELECT role, COUNT(*) as count
        FROM "Users"
        GROUP BY role
        ORDER BY count DESC
      `);

      console.log('\n👥 Users by Role:');
      userRoles.forEach(role => {
        console.log(`   ${role.role.padEnd(20)} ${role.count} users`);
      });
    } catch (error) {
      console.log('   Could not fetch user role distribution');
    }

    // Check recent activity
    try {
      const [recentUsers] = await sequelize.query(`
        SELECT
          COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days') as last_week,
          COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '30 days') as last_month,
          COUNT(*) as total
        FROM "Users"
      `);

      console.log('\n📅 User Registration Activity:');
      console.log(`   Last 7 days:  ${recentUsers[0].last_week} new users`);
      console.log(`   Last 30 days: ${recentUsers[0].last_month} new users`);
      console.log(`   Total:        ${recentUsers[0].total} users`);
    } catch (error) {
      console.log('   Could not fetch registration activity');
    }

    // Check if data is being saved
    console.log('\n💾 DATA PERSISTENCE CHECK');
    console.log('='.repeat(60));

    const criticalEmpty = results.filter(r => r.critical && r.count === 0);
    const hasData = results.some(r => r.count > 0);

    if (criticalEmpty.length > 0) {
      console.log('\n⚠️  CRITICAL TABLES WITH NO DATA:');
      criticalEmpty.forEach(r => {
        console.log(`   - ${r.table}: ${r.description}`);
      });
      console.log('\n   This may indicate:');
      console.log('   1. No users have registered/created data yet');
      console.log('   2. Data is not being persisted correctly');
      console.log('   3. Database migrations have not run');
    }

    if (hasData) {
      console.log('\n✅ DATA PERSISTENCE IS WORKING');
      console.log('   The database contains records, indicating persistence is functional.');
    } else {
      console.log('\n❌ NO DATA FOUND IN DATABASE');
      console.log('   Either:');
      console.log('   1. This is a fresh database with no user activity yet');
      console.log('   2. Data is not being saved (check API endpoints)');
    }

    // Storage usage
    try {
      const [dbSize] = await sequelize.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);
      console.log(`\n💾 Database Size: ${dbSize[0].size}`);
    } catch (error) {
      console.log('   Could not fetch database size');
    }

    await sequelize.close();
    console.log('\n✅ Audit complete\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

auditDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
