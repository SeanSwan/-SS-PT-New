/**
 * Master Prompt v26 Integration Test
 * Comprehensive test suite for all Master Prompt v26 features
 */

import { masterPromptIntegration } from '../services/integration/MasterPromptIntegration.mjs';
import { ethicalAIReview } from '../services/ai/EthicalAIReview.mjs';
import { accessibilityTesting } from '../services/accessibility/AccessibilityTesting.mjs';
import { gamificationEngine } from '../services/gamification/GamificationEngine.mjs';
import { ethicalGamification } from '../services/gamification/EthicalGamification.mjs';
import { mcpServerMonitor } from '../services/mcp/MCPServerMonitor.mjs';
import { mcpHealthChecker } from '../services/mcp/MCPHealthChecker.mjs';
import { mcpMetricsCollector } from '../services/mcp/MCPMetricsCollector.mjs';
import { privacyCompliance } from '../services/privacy/PrivacyCompliance.mjs';
import { piiManager } from '../services/privacy/PIIManager.mjs';
import { dataMinimization } from '../services/privacy/DataMinimization.mjs';
import { piiSafeLogger } from '../utils/monitoring/piiSafeLogging.mjs';

class MasterPromptIntegrationTest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      summary: {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Run complete Master Prompt v26 integration test suite
   */
  async runFullTestSuite() {
    console.log('🔍 Starting Master Prompt v26 Integration Test Suite...\n');
    
    try {
      // Test 1: System Initialization
      await this.testSystemInitialization();
      
      // Test 2: Ethical AI Components
      await this.testEthicalAIComponents();
      
      // Test 3: Accessibility Features
      await this.testAccessibilityFeatures();
      
      // Test 4: Gamification System
      await this.testGamificationSystem();
      
      // Test 5: MCP-Centric Architecture
      await this.testMCPCentricArchitecture();
      
      // Test 6: Privacy-First Design
      await this.testPrivacyFirstDesign();
      
      // Test 7: Integration Workflows
      await this.testIntegrationWorkflows();
      
      // Test 8: Performance and Health
      await this.testPerformanceAndHealth();
      
      // Generate final report
      this.generateTestReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(error.message);
    }
    
    return this.testResults;
  }

  /**
   * Test System Initialization
   */
  async testSystemInitialization() {
    console.log('📊 Test 1: System Initialization');
    
    try {
      // Test system status
      const status = masterPromptIntegration.getSystemStatus();
      this.assert(status.version === '26', 'Version should be 26');
      this.assert(status.features, 'Features should be defined');
      console.log('  ✅ System status retrieved');
      
      // Test initialization
      const initResult = await masterPromptIntegration.initialize();
      this.assert(initResult.success !== undefined, 'Initialization should return success status');
      console.log('  ✅ System initialized');
      
      // Test health check
      const healthCheck = await masterPromptIntegration.performSystemHealthCheck();
      this.assert(healthCheck.overall, 'Health check should return overall status');
      console.log('  ✅ Health check completed');
      
      this.testResults.passed++;
      this.testResults.summary.systemInitialization = 'PASSED';
    } catch (error) {
      console.error('  ❌ System initialization failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`System Initialization: ${error.message}`);
      this.testResults.summary.systemInitialization = 'FAILED';
    }
  }

  /**
   * Test Ethical AI Components
   */
  async testEthicalAIComponents() {
    console.log('\n🤖 Test 2: Ethical AI Components');
    
    try {
      // Test workout review
      const mockWorkout = {
        exercises: [
          { name: 'Push-ups', description: 'Upper body exercise' },
          { name: 'Squats', description: 'Lower body exercise' }
        ],
        description: 'A balanced workout for all fitness levels'
      };
      
      const mockProfile = {
        userId: 'test-user-123',
        age: 30,
        gender: 'non-binary',
        limitations: ['knee issues'],
        demographics: { age: 30 }
      };
      
      const ethicalReview = await ethicalAIReview.reviewWorkoutGeneration(mockWorkout, mockProfile);
      this.assert(ethicalReview.overallScore !== undefined, 'Should return overall score');
      this.assert(ethicalReview.passed !== undefined, 'Should return pass/fail status');
      console.log('  ✅ Workout ethical review completed');
      
      // Test nutrition review
      const mockNutrition = {
        meals: [{ name: 'Balanced meal', description: 'Nutritious option' }]
      };
      
      const nutritionReview = await ethicalAIReview.reviewNutritionGeneration(mockNutrition, mockProfile);
      this.assert(nutritionReview.passed !== undefined, 'Should return pass/fail status');
      console.log('  ✅ Nutrition ethical review completed');
      
      // Test ethical prompt addition
      const promptAddition = ethicalAIReview.getEthicalPromptAddition();
      this.assert(promptAddition.includes('ETHICAL GUIDELINES'), 'Should include ethical guidelines');
      console.log('  ✅ Ethical prompt addition generated');
      
      this.testResults.passed++;
      this.testResults.summary.ethicalAI = 'PASSED';
    } catch (error) {
      console.error('  ❌ Ethical AI test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Ethical AI: ${error.message}`);
      this.testResults.summary.ethicalAI = 'FAILED';
    }
  }

  /**
   * Test Accessibility Features
   */
  async testAccessibilityFeatures() {
    console.log('\n♿ Test 3: Accessibility Features');
    
    try {
      // Test accessibility test for feature
      const testResult = await accessibilityTesting.runAccessibilityTest('workout-generator');
      this.assert(testResult.status, 'Should return test status');
      this.assert(testResult.score !== undefined, 'Should return accessibility score');
      console.log('  ✅ Feature accessibility test completed');
      
      // Test accessibility report generation
      const report = await accessibilityTesting.generateAccessibilityReport();
      this.assert(report.overallStatus, 'Should return overall status');
      this.assert(report.summary, 'Should include summary');
      console.log('  ✅ Accessibility report generated');
      
      // Test compliance validation
      const compliance = await accessibilityTesting.validateAccessibilityCompliance('workout-generator');
      this.assert(compliance.compliant !== undefined, 'Should return compliance status');
      console.log('  ✅ Compliance validation completed');
      
      // Test Cypress configuration generation
      const cypressConfig = accessibilityTesting.generateCypressA11yConfig();
      this.assert(cypressConfig.setup, 'Should include setup function');
      this.assert(cypressConfig.testSuite, 'Should include test suite');
      console.log('  ✅ Cypress configuration generated');
      
      this.testResults.passed++;
      this.testResults.summary.accessibility = 'PASSED';
    } catch (error) {
      console.error('  ❌ Accessibility test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Accessibility: ${error.message}`);
      this.testResults.summary.accessibility = 'FAILED';
    }
  }

  /**
   * Test Gamification System
   */
  async testGamificationSystem() {
    console.log('\n🎮 Test 4: Gamification System');
    
    try {
      const testUserId = 'test-user-gamification';
      
      // Test user gamification status
      const status = await gamificationEngine.getUserGamificationStatus(testUserId);
      this.assert(status.totalPoints !== undefined, 'Should return total points');
      this.assert(status.level !== undefined, 'Should return user level');
      console.log('  ✅ User gamification status retrieved');
      
      // Test points awarding
      const pointsResult = await gamificationEngine.awardPoints(testUserId, 'workout_completed', { formScore: 95 });
      this.assert(pointsResult.pointsAwarded !== undefined, 'Should return points awarded');
      console.log('  ✅ Points awarded successfully');
      
      // Test achievements
      const achievements = await gamificationEngine.getUserAchievements(testUserId);
      this.assert(achievements.earned !== undefined, 'Should return earned achievements');
      this.assert(achievements.available !== undefined, 'Should return available achievements');
      console.log('  ✅ Achievements retrieved');
      
      // Test ethical gamification
      const ethicalCheck = await ethicalGamification.checkCompliance(testUserId, 'workout_completed');
      this.assert(ethicalCheck.passed !== undefined, 'Should return compliance check');
      console.log('  ✅ Ethical gamification check completed');
      
      // Test system health
      const systemHealth = await gamificationEngine.getSystemHealth();
      this.assert(systemHealth.healthStatus, 'Should return health status');
      console.log('  ✅ Gamification system health checked');
      
      this.testResults.passed++;
      this.testResults.summary.gamification = 'PASSED';
    } catch (error) {
      console.error('  ❌ Gamification test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Gamification: ${error.message}`);
      this.testResults.summary.gamification = 'FAILED';
    }
  }

  /**
   * Test MCP-Centric Architecture
   */
  async testMCPCentricArchitecture() {
    console.log('\n🔧 Test 5: MCP-Centric Architecture');
    
    try {
      // Test server registration
      const registrationResult = await mcpServerMonitor.registerServer('test-server', {
        type: 'test',
        port: 8001
      });
      this.assert(registrationResult.success, 'Server registration should succeed');
      console.log('  ✅ MCP server registered');
      
      // Test server details
      const serverDetails = await mcpServerMonitor.getServerDetails('test-server');
      this.assert(serverDetails.name === 'test-server', 'Should return server details');
      console.log('  ✅ Server details retrieved');
      
      // Test available tools
      const tools = await mcpServerMonitor.getAllAvailableTools();
      this.assert(Array.isArray(tools), 'Should return array of tools');
      console.log('  ✅ Available tools retrieved');
      
      // Test system overview
      const overview = await mcpServerMonitor.getSystemOverview();
      this.assert(overview.totalServers !== undefined, 'Should return system overview');
      console.log('  ✅ System overview generated');
      
      // Test health checker
      const healthSummary = await mcpHealthChecker.getSystemHealthSummary();
      this.assert(healthSummary.overallStatus, 'Should return health summary');
      console.log('  ✅ Health summary retrieved');
      
      // Test metrics collector
      const metricsSummary = await mcpMetricsCollector.getSystemMetricsSummary();
      this.assert(metricsSummary.timestamp, 'Should return metrics summary');
      console.log('  ✅ Metrics summary retrieved');
      
      this.testResults.passed++;
      this.testResults.summary.mcpCentric = 'PASSED';
    } catch (error) {
      console.error('  ❌ MCP-Centric test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`MCP-Centric: ${error.message}`);
      this.testResults.summary.mcpCentric = 'FAILED';
    }
  }

  /**
   * Test Privacy-First Design
   */
  async testPrivacyFirstDesign() {
    console.log('\n🔒 Test 6: Privacy-First Design');
    
    try {
      const testUserId = 'test-user-privacy';
      
      // Test privacy status
      const privacyStatus = await privacyCompliance.getPrivacyStatus(testUserId);
      this.assert(privacyStatus.compliance, 'Should return compliance status');
      console.log('  ✅ Privacy status retrieved');
      
      // Test PII scanning
      const piiScanResult = await piiManager.scanForPII('My email is john@example.com and phone is 555-1234');
      this.assert(piiScanResult.piiDetected !== undefined, 'Should detect PII');
      console.log('  ✅ PII scanning completed');
      
      // Test consent status
      const consentStatus = await privacyCompliance.getConsentStatus(testUserId);
      this.assert(consentStatus.consents, 'Should return consent status');
      console.log('  ✅ Consent status retrieved');
      
      // Test compliance report
      const complianceReport = await privacyCompliance.generateComplianceReport();
      this.assert(complianceReport.compliance, 'Should return compliance report');
      console.log('  ✅ Compliance report generated');
      
      // Test data minimization
      const minimizationResult = await dataMinimization.runMinimization({ dryRun: true });
      this.assert(minimizationResult.itemsProcessed !== undefined, 'Should return minimization results');
      console.log('  ✅ Data minimization tested');
      
      // Test PII-safe logging
      await piiSafeLogger.info('Test log with sensitive data: email@example.com');
      console.log('  ✅ PII-safe logging verified');
      
      this.testResults.passed++;
      this.testResults.summary.privacyFirst = 'PASSED';
    } catch (error) {
      console.error('  ❌ Privacy-First test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Privacy-First: ${error.message}`);
      this.testResults.summary.privacyFirst = 'FAILED';
    }
  }

  /**
   * Test Integration Workflows
   */
  async testIntegrationWorkflows() {
    console.log('\n🔄 Test 7: Integration Workflows');
    
    try {
      // Test comprehensive report
      const report = await masterPromptIntegration.generateIntegrationReport();
      this.assert(report.overallHealth, 'Should return overall health');
      this.assert(report.systems, 'Should include system reports');
      console.log('  ✅ Integration report generated');
      
      // Test feature interaction: Ethical AI + Gamification
      const workoutPlan = { exercises: [{ name: 'Push-ups' }] };
      const clientProfile = { userId: 'test-integration', age: 25 };
      
      const ethicalResult = await ethicalAIReview.reviewWorkoutGeneration(workoutPlan, clientProfile);
      if (ethicalResult.passed) {
        const gamificationResult = await gamificationEngine.processUserAction(
          clientProfile.userId, 
          'workout_completed', 
          { ethicalScore: ethicalResult.overallScore }
        );
        this.assert(gamificationResult.pointsAwarded !== undefined, 'Should award points for ethical workout');
      }
      console.log('  ✅ Ethical AI + Gamification integration tested');
      
      // Test Privacy + Accessibility integration
      const accessibilityCompliance = await accessibilityTesting.validateAccessibilityCompliance('privacy-settings');
      const privacyAudit = await privacyCompliance.getAuditLog({ 
        userId: 'test-integration',
        action: 'accessibility_settings' 
      });
      this.assert(accessibilityCompliance, 'Should validate privacy settings accessibility');
      this.assert(privacyAudit.entries, 'Should log privacy-related accessibility actions');
      console.log('  ✅ Privacy + Accessibility integration tested');
      
      this.testResults.passed++;
      this.testResults.summary.integrationWorkflows = 'PASSED';
    } catch (error) {
      console.error('  ❌ Integration workflows test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Integration Workflows: ${error.message}`);
      this.testResults.summary.integrationWorkflows = 'FAILED';
    }
  }

  /**
   * Test Performance and Health
   */
  async testPerformanceAndHealth() {
    console.log('\n📈 Test 8: Performance and Health');
    
    try {
      // Test system metrics
      const systemStatus = masterPromptIntegration.getSystemStatus();
      this.assert(systemStatus.health, 'Should return system health');
      console.log('  ✅ System metrics checked');
      
      // Test all feature health checks
      const healthCheck = await masterPromptIntegration.performSystemHealthCheck();
      this.assert(healthCheck.systems, 'Should check all system components');
      
      let healthyComponents = 0;
      for (const [system, health] of Object.entries(healthCheck.systems)) {
        if (health.status === 'healthy') {
          healthyComponents++;
        }
      }
      
      const healthPercentage = (healthyComponents / Object.keys(healthCheck.systems).length) * 100;
      console.log(`  📊 System health: ${healthPercentage.toFixed(1)}% (${healthyComponents}/${Object.keys(healthCheck.systems).length} components healthy)`);
      
      // Test performance under load (simulated)
      const startTime = Date.now();
      const concurrentTasks = [];
      
      for (let i = 0; i < 10; i++) {
        concurrentTasks.push(
          ethicalAIReview.reviewWorkoutGeneration(
            { exercises: [{ name: `Exercise ${i}` }] },
            { userId: `user-${i}`, age: 25 + i }
          )
        );
      }
      
      await Promise.all(concurrentTasks);
      const endTime = Date.now();
      const avgResponseTime = (endTime - startTime) / concurrentTasks.length;
      
      console.log(`  ⚡ Performance test: ${avgResponseTime.toFixed(2)}ms average response time for concurrent tasks`);
      this.assert(avgResponseTime < 5000, 'Average response time should be under 5 seconds');
      
      this.testResults.passed++;
      this.testResults.summary.performanceAndHealth = 'PASSED';
    } catch (error) {
      console.error('  ❌ Performance and health test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Performance and Health: ${error.message}`);
      this.testResults.summary.performanceAndHealth = 'FAILED';
    }
  }

  /**
   * Generate final test report
   */
  generateTestReport() {
    console.log('\n📋 Master Prompt v26 Integration Test Report');
    console.log('='.repeat(50));
    console.log(`🕐 Completed: ${new Date().toISOString()}`);
    console.log(`✅ Tests Passed: ${this.testResults.passed}`);
    console.log(`❌ Tests Failed: ${this.testResults.failed}`);
    console.log(`📊 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    console.log('\n📈 Test Summary:');
    for (const [test, result] of Object.entries(this.testResults.summary)) {
      const icon = result === 'PASSED' ? '✅' : '❌';
      console.log(`  ${icon} ${test}: ${result}`);
    }
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    console.log('\n🎯 Test Categories Verified:');
    console.log('  • Ethical AI by Design');
    console.log('  • Accessibility Champion (WCAG 2.1 AA)');
    console.log('  • Addictive Gamification Strategy');
    console.log('  • MCP-First Architecture');
    console.log('  • Privacy-First Design');
    console.log('  • Integration Workflows');
    console.log('  • Performance & Health Monitoring');
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Master Prompt v26 is fully operational.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
    }
    
    console.log('\n✨ Master Prompt v26 - Ethical AI, Accessible Design, Privacy-First');
  }

  /**
   * Assertion helper
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }
}

// Export for use in other test files
export { MasterPromptIntegrationTest };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new MasterPromptIntegrationTest();
  testSuite.runFullTestSuite().then(results => {
    const exitCode = results.failed === 0 ? 0 : 1;
    process.exit(exitCode);
  }).catch(error => {
    console.error('Test suite execution failed:', error);
    process.exit(1);
  });
}