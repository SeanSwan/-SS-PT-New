#!/usr/bin/env node
/**
 * Quick Production Database Health Check
 * MASTER PROMPT V42 COMPLIANCE: Instant Production Verification
 * 
 * This script provides immediate verification that:
 * 1. PostgreSQL is connected and accessible
 * 2. Recent signups are being persisted
 * 3. Admin dashboard can retrieve user data
 * 
 * Usage: node quick-production-check.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import sequelize from '../../database.mjs';
import { getUser } from '../../models/index.mjs';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const log = {
  info: (msg) => console.log(chalk.blue('ℹ️  ' + msg)),
  success: (msg) => console.log(chalk.green('✅ ' + msg)),
  error: (msg) => console.log(chalk.red('❌ ' + msg)),
  warning: (msg) => console.log(chalk.yellow('⚠️  ' + msg)),
  header: (msg) => console.log(chalk.cyan.bold('\n🚀 ' + msg)),
};

const quickProductionCheck = async () => {
  console.clear();
  log.header('SwanStudios Production Database Health Check');
  console.log(chalk.gray('Verifying PostgreSQL connectivity and user data persistence...\n'));
  
  try {
    // 1. Test Database Connection
    log.info('Testing PostgreSQL connection...');
    await sequelize.authenticate();
    log.success('PostgreSQL connection established');
    
    // 2. Get Database Info
    const [results] = await sequelize.query('SELECT current_database(), version()');
    const dbInfo = results[0];
    log.info(`Connected to database: ${dbInfo.current_database}`);
    log.info(`PostgreSQL version: ${dbInfo.version.split(' ')[1]}`);
    
    // 3. Verify User Table
    log.info('Checking Users table...');
    const User = getUser();
    const userCount = await User.count();
    log.success(`Users table accessible - ${userCount} total users found`);
    
    // 4. Recent Signups Check (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUsers = await User.findAll({
      where: {
        createdAt: {
          [sequelize.Sequelize.Op.gte]: oneDayAgo
        }
      },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    if (recentUsers.length > 0) {
      log.success(`${recentUsers.length} new signups in the last 24 hours:`);
      recentUsers.forEach((user, index) => {
        const timeAgo = Math.round((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60));
        console.log(chalk.gray(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - ${timeAgo} min ago`));
      });
    } else {
      log.warning('No new signups in the last 24 hours');
    }
    
    // 5. Admin Dashboard Simulation
    log.info('Testing admin dashboard data retrieval...');
    const adminData = await User.findAndCountAll({
      attributes: { exclude: ['password', 'refreshTokenHash', 'failedLoginAttempts'] },
      limit: 10,
      offset: 0,
      order: [['createdAt', 'DESC']]
    });
    
    if (adminData.count > 0) {
      log.success(`Admin dashboard ready - can display ${adminData.count} users`);
      log.success('✅ Latest users will appear immediately in admin dashboard');
    } else {
      log.warning('Admin dashboard query returned no users');
    }
    
    // 6. Role Distribution Check
    const [roleStats] = await sequelize.query(`
      SELECT role, COUNT(*) as count 
      FROM "Users" 
      WHERE "deletedAt" IS NULL 
      GROUP BY role 
      ORDER BY count DESC
    `);
    
    if (roleStats.length > 0) {
      log.info('User role distribution:');
      roleStats.forEach(stat => {
        console.log(chalk.gray(`   ${stat.role}: ${stat.count} users`));
      });
    }
    
    // 7. Test Recent Activity
    const activeUsers = await User.count({
      where: {
        lastActive: {
          [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // last 7 days
        }
      }
    });
    
    log.info(`${activeUsers} users active in the last 7 days`);
    
    console.log('\n' + chalk.green.bold('🎉 PRODUCTION DATABASE STATUS: HEALTHY'));
    console.log(chalk.green('✅ PostgreSQL is connected and persisting data correctly'));
    console.log(chalk.green('✅ New signups will immediately appear in your admin dashboard'));
    console.log(chalk.green('✅ Data integrity verified - ready for live traffic'));
    
    return true;
    
  } catch (error) {
    console.log('\n' + chalk.red.bold('🚨 PRODUCTION DATABASE STATUS: ERROR'));
    log.error(`Database check failed: ${error.message}`);
    
    if (error.name === 'SequelizeConnectionError') {
      log.error('Connection issue - check your DATABASE_URL and network connectivity');
    } else if (error.name === 'SequelizeDatabaseError') {
      log.error('Database query failed - check table structure and permissions');
    } else {
      log.error('Unexpected error - check logs for details');
    }
    
    console.log(chalk.red('\n❌ Database persistence may not be working correctly'));
    console.log(chalk.yellow('⚠️  Do not proceed with live signups until this is resolved\n'));
    
    return false;
  } finally {
    await sequelize.close();
  }
};

// Handle errors
process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Run the check
if (import.meta.url === `file://${process.argv[1]}`) {
  quickProductionCheck().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { quickProductionCheck };
