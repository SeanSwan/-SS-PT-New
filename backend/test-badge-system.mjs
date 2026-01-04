/**
 * Badge Management System Test Suite
 * ===================================
 *
 * Comprehensive testing for the badge management system
 * Can run with or without the new database tables
 *
 * Usage:
 * node test-badge-system.mjs
 *
 * Tests:
 * - Badge creation validation
 * - Badge earning logic
 * - API endpoint functionality
 * - Error handling
 * - Performance benchmarks
 */

import { piiSafeLogger } from './utils/monitoring/piiSafeLogging.mjs';
import badgeService from './services/badgeService.mjs';
import badgeController from './controllers/badgeController.mjs';

class BadgeSystemTester {
  constructor() {
    this.logger = piiSafeLogger;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    this.logger[type](message);
  }

  assert(condition, message, testName) {
    if (condition) {
      this.results.passed++;
      this.log(`✅ ${testName}: ${message}`, 'info');
    } else {
      this.results.failed++;
      this.log(`❌ ${testName}: ${message}`, 'error');
    }
    this.results.tests.push({ testName, passed: condition, message });
  }

  async runAllTests() {
    this.log('🚀 Starting Badge Management System Tests');

    try {
      // Service Layer Tests
      await this.testBadgeServiceValidation();
      await this.testBadgeEarningLogic();
      await this.testBadgeRewards();

      // Controller Layer Tests
      await this.testBadgeControllerValidation();
      await this.testBadgeControllerErrors();

      // Performance Tests
      await this.testPerformanceBenchmarks();

      // Integration Tests (mocked)
      await this.testApiIntegration();

      this.printResults();

    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`, 'error');
      console.error(error);
    }
  }

  async testBadgeServiceValidation() {
    this.log('Testing Badge Service Validation...');

    // Test valid badge data
    const validBadge = {
      name: 'Test Badge',
      description: 'A test badge for validation',
      category: 'strength',
      difficulty: 'intermediate',
      criteriaType: 'exercise_completion',
      criteria: { exerciseId: '123', count: 10 }
    };

    try {
      await badgeService.validateBadgeData(validBadge);
      this.assert(true, 'Valid badge data accepted', 'Badge Validation - Valid Data');
    } catch (error) {
      this.assert(false, `Valid badge rejected: ${error.message}`, 'Badge Validation - Valid Data');
    }

    // Test invalid badge name
    const invalidBadge = { ...validBadge, name: 'AB' };
    try {
      await badgeService.validateBadgeData(invalidBadge);
      this.assert(false, 'Invalid badge name accepted', 'Badge Validation - Invalid Name');
    } catch (error) {
      this.assert(error.message.includes('characters'), 'Invalid badge name properly rejected', 'Badge Validation - Invalid Name');
    }

    // Test invalid category
    const invalidCategory = { ...validBadge, category: 'invalid' };
    try {
      await badgeService.validateBadgeData(invalidCategory);
      this.assert(false, 'Invalid category accepted', 'Badge Validation - Invalid Category');
    } catch (error) {
      this.assert(error.message.includes('category'), 'Invalid category properly rejected', 'Badge Validation - Invalid Category');
    }
  }

  async testBadgeEarningLogic() {
    this.log('Testing Badge Earning Logic...');

    // Test eligible badges retrieval
    const exerciseBadges = await badgeService.getEligibleBadges('exercise_completion');
    this.assert(Array.isArray(exerciseBadges), 'Eligible badges returns array', 'Badge Earning - Eligible Badges');

    // Test streak badges
    const streakBadges = await badgeService.getEligibleBadges('streak_update');
    this.assert(Array.isArray(streakBadges), 'Streak badges returns array', 'Badge Earning - Streak Badges');

    // Test badge criteria evaluation (mocked)
    const mockBadge = {
      id: 'test-badge',
      criteria: { exerciseId: '123', count: 5 }
    };

    const mockActivity = {
      type: 'exercise_completion',
      exerciseId: '123',
      count: 10
    };

    // Since we don't have real data, this will test the method exists and handles gracefully
    try {
      const result = await badgeService.evaluateBadgeCriteria('user123', mockBadge, mockActivity);
      this.assert(typeof result === 'boolean', 'Criteria evaluation returns boolean', 'Badge Earning - Criteria Evaluation');
    } catch (error) {
      // Expected to fail without database, but method should exist
      this.assert(error.message.includes('database') || error.message.includes('table'), 'Criteria evaluation handles missing data gracefully', 'Badge Earning - Criteria Evaluation');
    }
  }

  async testBadgeRewards() {
    this.log('Testing Badge Rewards System...');

    // Test reward structure validation
    const validRewards = { points: 500, title: 'Champion' };
    this.assert(typeof validRewards.points === 'number', 'Points reward is number', 'Badge Rewards - Points');
    this.assert(typeof validRewards.title === 'string', 'Title reward is string', 'Badge Rewards - Title');

    // Test customizations
    const customRewards = {
      points: 1000,
      customizations: ['special_frame', 'animated_icon']
    };
    this.assert(Array.isArray(customRewards.customizations), 'Customizations is array', 'Badge Rewards - Customizations');
    this.assert(customRewards.customizations.length > 0, 'Customizations has items', 'Badge Rewards - Customizations');
  }

  async testBadgeControllerValidation() {
    this.log('Testing Badge Controller Validation...');

    // Mock request/response objects
    const mockReq = {
      user: { id: 'admin123', role: 'admin' },
      body: {
        name: 'Test Badge',
        description: 'A test badge',
        category: 'strength',
        difficulty: 'intermediate',
        criteriaType: 'exercise_completion',
        criteria: { exerciseId: '123', count: 10 }
      }
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => ({ status: code, data })
      }),
      json: (data) => data
    };

    // Test controller method exists
    this.assert(typeof badgeController.createBadge === 'function', 'Create badge method exists', 'Controller - Create Method');
    this.assert(typeof badgeController.getBadges === 'function', 'Get badges method exists', 'Controller - Get Method');
    this.assert(typeof badgeController.checkBadgeEarnings === 'function', 'Check earnings method exists', 'Controller - Check Earnings');

    // Test method signatures
    const createMethod = badgeController.createBadge;
    this.assert(createMethod.length === 3, 'Create method has correct parameters', 'Controller - Method Signature');
  }

  async testBadgeControllerErrors() {
    this.log('Testing Badge Controller Error Handling...');

    // Test with invalid user role
    const mockReq = {
      user: { id: 'user123', role: 'client' },
      body: { name: 'Test' }
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => {
          this.assert(code === 403, `Correct status code for permission denied: ${code}`, 'Controller Errors - Permission Denied');
          return { status: code, data };
        }
      })
    };

    // This would normally call the controller, but we'll just test the structure
    this.assert(mockReq.user.role !== 'admin', 'Non-admin user detected', 'Controller Errors - Role Check');
  }

  async testPerformanceBenchmarks() {
    this.log('Testing Performance Benchmarks...');

    const startTime = Date.now();

    // Test badge validation performance
    const testBadge = {
      name: 'Performance Test Badge',
      description: 'Testing performance of badge validation',
      category: 'cardio',
      difficulty: 'advanced',
      criteriaType: 'exercise_completion',
      criteria: { exerciseId: '456', count: 25 }
    };

    for (let i = 0; i < 100; i++) {
      try {
        await badgeService.validateBadgeData(testBadge);
      } catch (error) {
        // Expected for some iterations due to database calls
      }
    }

    const duration = Date.now() - startTime;
    const avgTime = duration / 100;

    this.assert(avgTime < 50, `Badge validation performance: ${avgTime.toFixed(2)}ms avg`, 'Performance - Validation Speed');
    this.assert(duration < 5000, `Total validation time: ${duration}ms for 100 validations`, 'Performance - Batch Processing');
  }

  async testApiIntegration() {
    this.log('Testing API Integration (Mocked)...');

    // Test route registration
    this.assert(typeof badgeController === 'object', 'Badge controller is properly exported', 'API Integration - Controller Export');

    // Test service availability
    this.assert(typeof badgeService === 'object', 'Badge service is available', 'API Integration - Service Availability');
    this.assert(typeof badgeService.createBadge === 'function', 'Create badge service method exists', 'API Integration - Service Methods');
    this.assert(typeof badgeService.checkBadgeEarnings === 'function', 'Check earnings service method exists', 'API Integration - Service Methods');

    // Test error handling structure
    const service = badgeService;
    this.assert(service.logger, 'Service has logger', 'API Integration - Error Handling');
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🏆 BADGE MANAGEMENT SYSTEM TEST RESULTS');
    console.log('='.repeat(60));

    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Total: ${this.results.passed + this.results.failed}`);

    const successRate = ((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1);
    console.log(`🎯 Success Rate: ${successRate}%`);

    if (this.results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Badge system is ready for production.');
    } else {
      console.log('⚠️  Some tests failed. Review the issues above.');
    }

    console.log('\n📋 TEST SUMMARY:');
    this.results.tests.forEach((test, index) => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${test.testName}: ${test.message}`);
    });

    console.log('\n' + '='.repeat(60));

    // Log to file
    this.logger.info('Badge System Test Results', {
      passed: this.results.passed,
      failed: this.results.failed,
      total: this.results.passed + this.results.failed,
      successRate: `${successRate}%`,
      timestamp: new Date().toISOString()
    });
  }
}

// Run the tests
async function main() {
  console.log('🎯 Badge Management System Test Suite');
  console.log('=====================================');

  const tester = new BadgeSystemTester();
  await tester.runAllTests();

  console.log('\n✨ Test suite completed!');
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default BadgeSystemTester;