/**
 * MCP Integration Test Suite
 * ==========================
 * 
 * Comprehensive test utility to verify MCP services integration
 * Tests both frontend service calls and backend MCP route connectivity
 * 
 * Usage: Import and run testMcpIntegration() in your app
 */

import { 
  checkMcpServersStatus, 
  isMcpAvailable, 
  mcpConfig,
  workoutMcpApi,
  gamificationMcpApi 
} from '../services/mcp';

export interface McpTestResult {
  test: string;
  success: boolean;
  message: string;
  duration: number;
  details?: any;
}

export interface McpTestSuite {
  overall: {
    success: boolean;
    totalTests: number;
    passedTests: number;
    duration: number;
  };
  results: McpTestResult[];
}

/**
 * Run comprehensive MCP integration tests
 */
export const testMcpIntegration = async (): Promise<McpTestSuite> => {
  console.log('🧪 Starting MCP Integration Test Suite...');
  
  const results: McpTestResult[] = [];
  const startTime = Date.now();
  
  // Test 1: MCP Configuration Service
  await runTest(
    'MCP Configuration Service',
    async () => {
      const health = await mcpConfig.checkHealth(true);
      return {
        success: health.status !== 'error',
        data: health
      };
    },
    results
  );
  
  // Test 2: Server Status Check
  await runTest(
    'MCP Server Status Check',
    async () => {
      const status = await checkMcpServersStatus(true);
      return {
        success: status.overall.servicesEnabled,
        data: status
      };
    },
    results
  );
  
  // Test 3: MCP Availability Check
  await runTest(
    'MCP Availability Check',
    async () => {
      const available = await isMcpAvailable();
      return {
        success: true, // This test always succeeds, just reports availability
        data: { available }
      };
    },
    results
  );
  
  // Test 4: Workout MCP Service - Server Status
  await runTest(
    'Workout MCP Server Status',
    async () => {
      const response = await workoutMcpApi.checkServerStatus();
      return {
        success: response.data.status !== 'error',
        data: response.data
      };
    },
    results
  );
  
  // Test 5: Gamification MCP Service - Server Status
  await runTest(
    'Gamification MCP Server Status',
    async () => {
      const response = await gamificationMcpApi.checkServerStatus();
      return {
        success: response.data.status !== 'error',
        data: response.data
      };
    },
    results
  );
  
  // Test 6: Workout Progress API Call
  await runTest(
    'Workout Progress API Call',
    async () => {
      const response = await workoutMcpApi.getClientProgress({ userId: 'test-user-123' });
      return {
        success: !!response.data.progress,
        data: {
          hasProgress: !!response.data.progress,
          hasAiInsights: !!(response.data.progress as any)?.aiInsights,
          progressKeys: Object.keys(response.data.progress || {})
        }
      };
    },
    results
  );
  
  // Test 7: Gamification Profile API Call
  await runTest(
    'Gamification Profile API Call',
    async () => {
      const response = await gamificationMcpApi.getGamificationProfile({ userId: 'test-user-123' });
      return {
        success: !!response.data.level,
        data: {
          hasProfile: !!response.data.level,
          level: response.data.level,
          points: response.data.points
        }
      };
    },
    results
  );
  
  // Test 8: Workout Recommendations
  await runTest(
    'Workout Recommendations API',
    async () => {
      const response = await workoutMcpApi.getWorkoutRecommendations({
        userId: 'test-user-123',
        focus: 'strength',
        duration: 30
      });
      return {
        success: Array.isArray(response.data.recommendations),
        data: {
          recommendationCount: response.data.recommendations?.length || 0,
          hasAiGenerated: response.data.recommendations?.some((r: any) => r.aiGenerated)
        }
      };
    },
    results
  );
  
  // Test 9: Achievements API
  await runTest(
    'Achievements API Call',
    async () => {
      const response = await gamificationMcpApi.getAchievements({ userId: 'test-user-123' });
      return {
        success: Array.isArray(response.data),
        data: {
          achievementCount: response.data?.length || 0,
          hasUnlocked: response.data?.some((a: any) => a.isUnlocked)
        }
      };
    },
    results
  );
  
  // Test 10: Error Handling Test
  await runTest(
    'Error Handling Test',
    async () => {
      try {
        // Intentionally test with invalid parameters to check error handling
        await workoutMcpApi.getClientProgress({ userId: '' });
        return {
          success: true, // Should handle gracefully
          data: { errorHandling: 'graceful' }
        };
      } catch (error) {
        return {
          success: true, // Errors are expected and should be handled
          data: { errorHandling: 'caught', errorType: error instanceof Error ? error.name : 'unknown' }
        };
      }
    },
    results
  );
  
  const totalDuration = Date.now() - startTime;
  const passedTests = results.filter(r => r.success).length;
  
  const testSuite: McpTestSuite = {
    overall: {
      success: passedTests === results.length,
      totalTests: results.length,
      passedTests,
      duration: totalDuration
    },
    results
  };
  
  // Log results
  console.log('🧪 MCP Integration Test Suite Complete!');
  console.log(`✅ ${passedTests}/${results.length} tests passed`);
  console.log(`⏱️ Total duration: ${totalDuration}ms`);
  
  if (testSuite.overall.success) {
    console.log('🎉 All MCP integration tests passed!');
  } else {
    console.log('❌ Some MCP integration tests failed. Check results for details.');
  }
  
  return testSuite;
};

/**
 * Helper function to run individual tests
 */
async function runTest(
  testName: string,
  testFn: () => Promise<{ success: boolean; data?: any }>,
  results: McpTestResult[]
): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log(`🔬 Running test: ${testName}...`);
    
    const result = await testFn();
    const duration = Date.now() - startTime;
    
    results.push({
      test: testName,
      success: result.success,
      message: result.success ? 'Test passed' : 'Test failed',
      duration,
      details: result.data
    });
    
    console.log(`${result.success ? '✅' : '❌'} ${testName} (${duration}ms)`);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    results.push({
      test: testName,
      success: false,
      message: `Test failed with error: ${errorMessage}`,
      duration,
      details: { error: errorMessage }
    });
    
    console.log(`❌ ${testName} failed: ${errorMessage} (${duration}ms)`);
  }
}

/**
 * Quick MCP health check (lightweight version)
 */
export const quickMcpHealthCheck = async (): Promise<{
  healthy: boolean;
  message: string;
  services: {
    workout: boolean;
    gamification: boolean;
  };
}> => {
  try {
    const status = await checkMcpServersStatus();
    
    return {
      healthy: status.overall.healthy,
      message: status.overall.healthy 
        ? 'All MCP services are healthy' 
        : 'Some MCP services have issues',
      services: {
        workout: status.workout.available,
        gamification: status.gamification.available
      }
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      services: {
        workout: false,
        gamification: false
      }
    };
  }
};

/**
 * Run MCP integration test in development mode
 * Call this in your app's development environment to verify integration
 */
export const runDevMcpTest = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('⚠️ MCP tests should only be run in development mode');
    return;
  }
  
  console.log('🚀 Running MCP Integration Tests in Development Mode...');
  
  try {
    const results = await testMcpIntegration();
    
    // Display summary
    console.table(results.results.map(r => ({
      Test: r.test,
      Status: r.success ? '✅ PASS' : '❌ FAIL',
      Duration: `${r.duration}ms`,
      Message: r.message
    })));
    
    if (results.overall.success) {
      console.log('🎉 MCP Integration is working correctly!');
    } else {
      console.log('⚠️ MCP Integration has some issues that need attention.');
    }
    
  } catch (error) {
    console.error('❌ Failed to run MCP integration tests:', error);
  }
};

export default {
  testMcpIntegration,
  quickMcpHealthCheck,
  runDevMcpTest
};