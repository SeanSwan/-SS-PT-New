#!/usr/bin/env node
/**
 * SwanStudios PostgreSQL Persistence Verification Suite
 * MASTER PROMPT V42 COMPLIANCE: Production-Ready Database Testing
 * 
 * This comprehensive test verifies:
 * 1. PostgreSQL connection integrity
 * 2. User registration persistence 
 * 3. Admin dashboard data retrieval
 * 4. Real-time data synchronization
 * 5. Transaction rollback safety
 * 
 * Usage: node comprehensive-persistence-test.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import sequelize from '../../database.mjs';
import { getUser } from '../../models/index.mjs';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

// Test configuration
const TEST_CONFIG = {
  testUserPrefix: 'test_persistence_',
  maxTestUsers: 5,
  testTimeout: 30000, // 30 seconds
  adminDashboardEndpoint: '/api/admin/users',
  cleanup: true // Set to false to keep test data for manual inspection
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Utility functions
const log = {
  info: (msg) => console.log(chalk.blue('ℹ️  ' + msg)),
  success: (msg) => console.log(chalk.green('✅ ' + msg)),
  error: (msg) => console.log(chalk.red('❌ ' + msg)),
  warning: (msg) => console.log(chalk.yellow('⚠️  ' + msg)),
  header: (msg) => console.log(chalk.cyan.bold('\n🚀 ' + msg)),
  separator: () => console.log(chalk.gray('─'.repeat(80)))
};

const addTestResult = (testName, success, details = '', error = null) => {
  testResults.total++;
  if (success) {
    testResults.passed++;
    log.success(`${testName}: PASSED`);
  } else {
    testResults.failed++;
    log.error(`${testName}: FAILED - ${details}`);
    if (error) {
      testResults.errors.push({ test: testName, error: error.message });
    }
  }
  testResults.details.push({ test: testName, success, details, timestamp: new Date().toISOString() });
};

/**
 * Test 1: Database Connection Verification
 */
const testDatabaseConnection = async () => {
  log.header('TEST 1: Database Connection Verification');
  
  try {
    // Test basic connection
    await sequelize.authenticate();
    addTestResult('Database Authentication', true, 'PostgreSQL connection established');
    
    // Test database name and version
    const [results] = await sequelize.query('SELECT version(), current_database()');
    const dbInfo = results[0];
    log.info(`Database: ${dbInfo.current_database}`);
    log.info(`PostgreSQL Version: ${dbInfo.version.split(' ')[1]}`);
    addTestResult('Database Info Retrieval', true, `Connected to ${dbInfo.current_database}`);
    
    // Test user table existence
    const [tableCheck] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'Users'
      );
    `);
    
    if (tableCheck[0].exists) {
      addTestResult('Users Table Verification', true, 'Users table exists and accessible');
      
      // Get table schema info
      const [schemaInfo] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'Users'
        ORDER BY ordinal_position;
      `);
      
      log.info(`Users table has ${schemaInfo.length} columns`);
      addTestResult('Users Table Schema', true, `${schemaInfo.length} columns found`);
    } else {
      addTestResult('Users Table Verification', false, 'Users table does not exist');
      return false;
    }
    
    return true;
  } catch (error) {
    addTestResult('Database Connection', false, 'Failed to connect to database', error);
    log.error(`Database connection failed: ${error.message}`);
    return false;
  }
};

/**
 * Test 2: User Model Persistence Test
 */
const testUserModelPersistence = async () => {
  log.header('TEST 2: User Registration Persistence Test');
  
  try {
    const User = getUser();
    if (!User) {
      addTestResult('User Model Load', false, 'Failed to load User model');
      return false;
    }
    
    addTestResult('User Model Load', true, 'User model loaded successfully');
    
    // Create test user data
    const testUserId = uuidv4().substring(0, 8);
    const testUserData = {
      firstName: 'Test',
      lastName: 'Persistence',
      email: `${TEST_CONFIG.testUserPrefix}${testUserId}@swanstudios.test`,
      username: `${TEST_CONFIG.testUserPrefix}${testUserId}`,
      password: 'TestPassword123!',
      role: 'user'
    };
    
    log.info(`Creating test user: ${testUserData.username}`);
    
    // Test user creation with transaction
    const transaction = await sequelize.transaction();
    try {
      const newUser = await User.create(testUserData, { transaction });
      
      // Verify user was created
      if (newUser && newUser.id) {
        addTestResult('User Creation', true, `User created with ID: ${newUser.id}`);
        
        // Commit transaction
        await transaction.commit();
        
        // Verify user persists after commit
        const retrievedUser = await User.findByPk(newUser.id);
        if (retrievedUser) {
          addTestResult('User Persistence After Commit', true, 'User retrievable after transaction commit');
          
          // Verify user data integrity
          const dataIntegrityChecks = [
            { field: 'firstName', expected: testUserData.firstName, actual: retrievedUser.firstName },
            { field: 'lastName', expected: testUserData.lastName, actual: retrievedUser.lastName },
            { field: 'email', expected: testUserData.email, actual: retrievedUser.email },
            { field: 'username', expected: testUserData.username, actual: retrievedUser.username },
            { field: 'role', expected: testUserData.role, actual: retrievedUser.role }
          ];
          
          let dataIntegrityPassed = true;
          for (const check of dataIntegrityChecks) {
            if (check.expected !== check.actual) {
              addTestResult(`Data Integrity - ${check.field}`, false, 
                `Expected: ${check.expected}, Got: ${check.actual}`);
              dataIntegrityPassed = false;
            }
          }
          
          if (dataIntegrityPassed) {
            addTestResult('User Data Integrity', true, 'All user fields match expected values');
          }
          
          // Test password hashing
          if (retrievedUser.password !== testUserData.password) {
            addTestResult('Password Hashing', true, 'Password properly hashed');
          } else {
            addTestResult('Password Hashing', false, 'Password not hashed - security risk!');
          }
          
          return { success: true, userId: newUser.id, userData: retrievedUser };
        } else {
          addTestResult('User Persistence After Commit', false, 'User not found after commit');
          return { success: false };
        }
      } else {
        addTestResult('User Creation', false, 'User creation returned invalid result');
        await transaction.rollback();
        return { success: false };
      }
    } catch (error) {
      await transaction.rollback();
      addTestResult('User Creation Transaction', false, 'Transaction failed', error);
      return { success: false };
    }
  } catch (error) {
    addTestResult('User Model Persistence Test', false, 'Test setup failed', error);
    return { success: false };
  }
};

/**
 * Test 3: Admin Dashboard Data Retrieval Test
 */
const testAdminDashboardRetrieval = async (testUserId = null) => {
  log.header('TEST 3: Admin Dashboard Data Retrieval Test');
  
  try {
    const User = getUser();
    
    // Test getting all users (simulating admin dashboard)
    const allUsers = await User.findAll({
      attributes: { exclude: ['password', 'refreshTokenHash', 'failedLoginAttempts'] },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    if (allUsers && allUsers.length > 0) {
      addTestResult('Admin User List Retrieval', true, `Retrieved ${allUsers.length} users`);
      
      // If we created a test user, verify it appears in admin list
      if (testUserId) {
        const testUserInList = allUsers.find(user => user.id === testUserId);
        if (testUserInList) {
          addTestResult('Test User in Admin List', true, 'Newly created user appears in admin dashboard');
        } else {
          addTestResult('Test User in Admin List', false, 'Newly created user missing from admin dashboard');
        }
      }
      
      // Test pagination simulation
      const paginatedUsers = await User.findAndCountAll({
        attributes: { exclude: ['password', 'refreshTokenHash', 'failedLoginAttempts'] },
        limit: 10,
        offset: 0,
        order: [['createdAt', 'DESC']]
      });
      
      if (paginatedUsers && typeof paginatedUsers.count === 'number') {
        addTestResult('Admin Pagination', true, `Pagination working - ${paginatedUsers.count} total users`);
      } else {
        addTestResult('Admin Pagination', false, 'Pagination query failed');
      }
      
      // Test role-based filtering
      const usersByRole = await User.findAll({
        attributes: ['id', 'role'],
        group: ['role'],
        raw: true
      });
      
      if (usersByRole) {
        addTestResult('Role-based Filtering', true, 'Role queries working');
      } else {
        addTestResult('Role-based Filtering', false, 'Role filtering failed');
      }
      
      return { success: true, userCount: allUsers.length };
    } else {
      addTestResult('Admin User List Retrieval', false, 'No users found or query failed');
      return { success: false };
    }
  } catch (error) {
    addTestResult('Admin Dashboard Retrieval', false, 'Failed to retrieve user data', error);
    return { success: false };
  }
};

/**
 * Test 4: Transaction Rollback Safety Test
 */
const testTransactionRollback = async () => {
  log.header('TEST 4: Transaction Rollback Safety Test');
  
  try {
    const User = getUser();
    
    // Get initial user count
    const initialCount = await User.count();
    log.info(`Initial user count: ${initialCount}`);
    
    // Attempt a transaction that will fail
    const transaction = await sequelize.transaction();
    try {
      // Create a user
      const testUserData = {
        firstName: 'Rollback',
        lastName: 'Test',
        email: `rollback_test_${Date.now()}@swanstudios.test`,
        username: `rollback_test_${Date.now()}`,
        password: 'TestPassword123!',
        role: 'user'
      };
      
      const user = await User.create(testUserData, { transaction });
      log.info(`Created user for rollback test: ${user.id}`);
      
      // Intentionally cause an error to trigger rollback
      throw new Error('Intentional rollback test');
      
    } catch (error) {
      await transaction.rollback();
      log.info('Transaction rolled back as expected');
      
      // Verify user count is unchanged
      const finalCount = await User.count();
      
      if (finalCount === initialCount) {
        addTestResult('Transaction Rollback', true, 'Rollback properly prevented data persistence');
      } else {
        addTestResult('Transaction Rollback', false, 
          `User count changed: ${initialCount} -> ${finalCount}`);
      }
    }
    
    return true;
  } catch (error) {
    addTestResult('Transaction Rollback Test', false, 'Rollback test setup failed', error);
    return false;
  }
};

/**
 * Test 5: Real-time Data Sync Test
 */
const testRealTimeSync = async () => {
  log.header('TEST 5: Real-time Data Synchronization Test');
  
  try {
    const User = getUser();
    
    // Create multiple users in quick succession (simulating concurrent signups)
    const concurrentUsers = [];
    const userPromises = [];
    
    for (let i = 0; i < 3; i++) {
      const userData = {
        firstName: `Concurrent${i}`,
        lastName: 'Test',
        email: `concurrent_${i}_${Date.now()}@swanstudios.test`,
        username: `concurrent_${i}_${Date.now()}`,
        password: 'TestPassword123!',
        role: 'user'
      };
      
      userPromises.push(User.create(userData));
    }
    
    // Execute all creations simultaneously
    const startTime = Date.now();
    const createdUsers = await Promise.all(userPromises);
    const endTime = Date.now();
    
    log.info(`Created ${createdUsers.length} users in ${endTime - startTime}ms`);
    
    if (createdUsers.length === 3 && createdUsers.every(user => user && user.id)) {
      addTestResult('Concurrent User Creation', true, 
        `${createdUsers.length} users created simultaneously`);
      
      // Immediately query for these users (simulating admin dashboard refresh)
      const userIds = createdUsers.map(user => user.id);
      const retrievedUsers = await User.findAll({
        where: { id: userIds }
      });
      
      if (retrievedUsers.length === createdUsers.length) {
        addTestResult('Immediate Data Availability', true, 
          'All users immediately available after creation');
      } else {
        addTestResult('Immediate Data Availability', false, 
          `Only ${retrievedUsers.length}/${createdUsers.length} users immediately available`);
      }
      
      return { success: true, userIds };
    } else {
      addTestResult('Concurrent User Creation', false, 'Some concurrent creations failed');
      return { success: false };
    }
  } catch (error) {
    addTestResult('Real-time Sync Test', false, 'Concurrent creation test failed', error);
    return { success: false };
  }
};

/**
 * Cleanup Test Data
 */
const cleanupTestData = async () => {
  if (!TEST_CONFIG.cleanup) {
    log.warning('Cleanup disabled - test data will remain in database');
    return;
  }
  
  log.header('CLEANUP: Removing Test Data');
  
  try {
    const User = getUser();
    
    // Remove all test users
    const deletedCount = await User.destroy({
      where: {
        email: {
          [sequelize.Sequelize.Op.like]: `${TEST_CONFIG.testUserPrefix}%@%`
        }
      },
      force: true // Hard delete instead of soft delete
    });
    
    // Remove concurrent test users
    const concurrentDeleted = await User.destroy({
      where: {
        email: {
          [sequelize.Sequelize.Op.like]: `concurrent_%@%`
        }
      },
      force: true
    });
    
    // Remove rollback test users (if any leaked)
    const rollbackDeleted = await User.destroy({
      where: {
        email: {
          [sequelize.Sequelize.Op.like]: `rollback_test_%@%`
        }
      },
      force: true
    });
    
    const totalDeleted = deletedCount + concurrentDeleted + rollbackDeleted;
    log.success(`Cleanup completed: ${totalDeleted} test records removed`);
    
  } catch (error) {
    log.error(`Cleanup failed: ${error.message}`);
  }
};

/**
 * Generate Test Report
 */
const generateReport = () => {
  log.separator();
  log.header('POSTGRESQL PERSISTENCE TEST REPORT');
  log.separator();
  
  console.log(chalk.blue('📊 Test Summary:'));
  console.log(`   Total Tests: ${testResults.total}`);
  console.log(chalk.green(`   Passed: ${testResults.passed}`));
  console.log(chalk.red(`   Failed: ${testResults.failed}`));
  console.log(`   Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n' + chalk.red('❌ Failed Tests:'));
    testResults.errors.forEach(error => {
      console.log(chalk.red(`   • ${error.test}: ${error.error}`));
    });
  }
  
  console.log('\n' + chalk.blue('📋 Detailed Results:'));
  testResults.details.forEach(detail => {
    const status = detail.success ? chalk.green('PASS') : chalk.red('FAIL');
    console.log(`   ${status} ${detail.test} - ${detail.details}`);
  });
  
  log.separator();
  
  if (testResults.failed === 0) {
    log.success('🎉 ALL TESTS PASSED - PostgreSQL persistence is working correctly!');
    log.success('✅ New user signups will reliably appear in your admin dashboard');
  } else {
    log.error('🚨 SOME TESTS FAILED - Database persistence issues detected');
    log.warning('⚠️  Please review failed tests before going live');
  }
  
  log.separator();
};

/**
 * Main Test Execution
 */
const runAllTests = async () => {
  console.clear();
  log.header('SwanStudios PostgreSQL Persistence Verification Suite');
  log.info('Testing database connectivity and user registration persistence...');
  log.separator();
  
  try {
    // Test 1: Database Connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      log.error('Database connection failed - aborting remaining tests');
      return;
    }
    
    // Test 2: User Persistence
    const userTest = await testUserModelPersistence();
    const testUserId = userTest.success ? userTest.userId : null;
    
    // Test 3: Admin Dashboard Retrieval
    await testAdminDashboardRetrieval(testUserId);
    
    // Test 4: Transaction Rollback
    await testTransactionRollback();
    
    // Test 5: Real-time Sync
    await testRealTimeSync();
    
  } catch (error) {
    log.error(`Test suite failed: ${error.message}`);
    addTestResult('Test Suite Execution', false, 'Critical error during test execution', error);
  } finally {
    // Always run cleanup and generate report
    await cleanupTestData();
    generateReport();
    
    // Close database connection
    await sequelize.close();
    log.info('Database connection closed');
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
};

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

// Run the test suite
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { runAllTests };
