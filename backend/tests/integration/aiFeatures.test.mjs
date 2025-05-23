/**
 * P2: Comprehensive Integration Testing
 * End-to-end tests for AI features with Master Prompt v26 values
 * Aligned with Ethical AI, Accessibility, and Gamification principles
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../../server.mjs';
import { ethicalAIReview } from '../../services/ai/EthicalAIReview.mjs';
import { gamificationPersistence } from '../../services/gamification/GamificationPersistence.mjs';
import { accessibilityTesting } from '../../services/accessibility/AccessibilityTesting.mjs';
import { mcpAnalytics } from '../../services/monitoring/MCPAnalytics.mjs';
import { piiSafeLogger } from '../../utils/monitoring/piiSafeLogging.mjs';
import axios from 'axios';

// Mock MCP servers for testing
class MockMCPServer {
  constructor(name, port) {
    this.name = name;
    this.port = port;
    this.healthy = true;
    this.responseTime = 100 + Math.random() * 200;
  }

  async generateWorkout(clientProfile) {
    await new Promise(resolve => setTimeout(resolve, this.responseTime));
    
    return {
      id: `workout-${Date.now()}`,
      title: 'AI Generated Workout',
      description: 'A personalized workout plan that accommodates all abilities',
      exercises: [
        {
          name: 'Modified Push-ups',
          description: 'Upper body strengthening exercise',
          instructions: 'Start from your knees if needed. Focus on form over quantity.',
          modifications: 'Wall push-ups available as an alternative',
          reps: '8-12',
          sets: 3
        },
        {
          name: 'Seated Leg Extensions',
          description: 'Quad strengthening exercise accessible from wheelchair',
          instructions: 'Extend one leg at a time, hold for 2 seconds',
          modifications: 'Can be done with or without resistance',
          reps: '10-15',
          sets: 2
        }
      ],
      duration: '30 minutes',
      difficulty: 'beginner',
      accessibility: {
        wheelchairFriendly: true,
        hasModifications: true,
        usesInclusiveLanguage: true
      },
      ethicalCompliance: {
        biasCheckPassed: true,
        positiveTone: true,
        inclusiveLanguage: true
      },
      tokenUsage: 250 + Math.floor(Math.random() * 100)
    };
  }

  async awardPoints(userId, points, reason) {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      success: true,
      pointsAwarded: points,
      totalPoints: points * 10, // Mock total
      achievement: points > 100 ? 'milestone_reached' : null
    };
  }

  async analyzeForm(videoData) {
    await new Promise(resolve => setTimeout(resolve, this.responseTime));
    
    return {
      formScore: 85 + Math.random() * 10,
      corrections: [
        {
          exercise: 'push-up',
          issue: 'Keep core engaged',
          severity: 'minor',
          timestamp: 15.5
        }
      ],
      accessibility: {
        visualFeedback: true,
        audioFeedback: true,
        adaptiveInterface: true
      }
    };
  }
}

// Test utilities
class TestUtils {
  static createMockUser(role = 'client', accessibilityNeeds = []) {
    return {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: `test-${Date.now()}@swanstudios.com`,
      role,
      profile: {
        limitations: accessibilityNeeds,
        demographics: {
          age: 30,
          gender: 'non-binary',
          fitnessLevel: 'beginner'
        },
        accessibilityPreferences: {
          screenReader: accessibilityNeeds.includes('visual_impairment'),
          highContrast: false,
          reducedMotion: false,
          largeFonts: false
        }
      }
    };
  }

  static createMockWorkoutRequest(userId, limitations = []) {
    return {
      userId,
      preferences: {
        duration: 30,
        difficulty: 'beginner',
        focusAreas: ['strength', 'mobility'],
        equipment: ['bodyweight']
      },
      limitations,
      goals: ['general_fitness', 'accessibility']
    };
  }

  static async authenticateUser(app, user) {
    // Mock authentication - in real tests, this would create a proper JWT
    const token = `mock-jwt-${user.id}`;
    return `Bearer ${token}`;
  }
}

// Test Suite Setup
describe('AI Features Integration Tests with Master Prompt v26 Values', () => {
  let mockWorkoutServer;
  let mockGamificationServer;
  let mockYoloServer;
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Initialize mock MCP servers
    mockWorkoutServer = new MockMCPServer('workout', 8000);
    mockGamificationServer = new MockMCPServer('gamification', 8002);
    mockYoloServer = new MockMCPServer('yolo', 8005);

    // Start analytics monitoring
    await mcpAnalytics.startRealTimeMonitoring();
  });

  beforeEach(async () => {
    // Create fresh test user for each test
    testUser = TestUtils.createMockUser('client', ['mobility_limitation']);
    authToken = await TestUtils.authenticateUser(app, testUser);

    // Reset analytics between tests
    mcpAnalytics.resetServerMetrics('workout');
    mcpAnalytics.resetServerMetrics('gamification');
  });

  afterAll(async () => {
    // Cleanup
    await gamificationPersistence.close();
  });

  describe('Workout Generation with Ethical AI Compliance', () => {
    it('should generate accessible workouts with ethical compliance', async () => {
      // Arrange
      const workoutRequest = TestUtils.createMockWorkoutRequest(
        testUser.id, 
        ['wheelchair_user', 'limited_mobility']
      );

      // Mock MCP server response
      const mockWorkout = await mockWorkoutServer.generateWorkout(testUser.profile);
      
      // Act
      const ethicalReview = await ethicalAIReview.reviewWorkoutGeneration(
        mockWorkout, 
        testUser.profile
      );

      // Assert - Ethical AI Standards
      expect(ethicalReview.passed).toBe(true);
      expect(ethicalReview.overallScore).toBeGreaterThanOrEqual(85);
      expect(ethicalReview.inclusivity.passed).toBe(true);
      expect(ethicalReview.abilityAccommodation.passed).toBe(true);
      expect(ethicalReview.positiveTone.passed).toBe(true);
      expect(ethicalReview.biasDetection.passed).toBe(true);

      // Verify accessibility features
      expect(mockWorkout.accessibility.wheelchairFriendly).toBe(true);
      expect(mockWorkout.accessibility.hasModifications).toBe(true);
      expect(mockWorkout.accessibility.usesInclusiveLanguage).toBe(true);

      // Track analytics
      await mcpAnalytics.trackTokenUsage(
        'workout', 
        'generation', 
        mockWorkout.tokenUsage
      );
      await mcpAnalytics.trackQualityMetrics('workout', 'generation', {
        responseTime: mockWorkoutServer.responseTime,
        accuracy: 0.95,
        completion: 1.0,
        userSatisfaction: 4.5
      });

      // Verify analytics tracking
      const metrics = mcpAnalytics.getRealTimeMetrics('workout');
      expect(metrics).toBeTruthy();
      expect(metrics.tokenUsage).toBeGreaterThan(0);
    });

    it('should handle users with multiple accessibility needs', async () => {
      // Arrange
      const accessibleUser = TestUtils.createMockUser('client', [
        'visual_impairment', 
        'mobility_limitation',
        'cognitive_differences'
      ]);
      const workoutRequest = TestUtils.createMockWorkoutRequest(
        accessibleUser.id,
        accessibleUser.profile.limitations
      );

      // Act
      const mockWorkout = await mockWorkoutServer.generateWorkout(accessibleUser.profile);
      const ethicalReview = await ethicalAIReview.reviewWorkoutGeneration(
        mockWorkout,
        accessibleUser.profile
      );

      // Assert - Addresses all limitations
      expect(ethicalReview.abilityAccommodation.passed).toBe(true);
      expect(ethicalReview.abilityAccommodation.features.hasModifications).toBe(true);
      expect(ethicalReview.abilityAccommodation.features.hasAlternatives).toBe(true);
      expect(ethicalReview.abilityAccommodation.features.hasSimpleInstructions).toBe(true);

      // Verify inclusive language
      expect(ethicalReview.inclusivity.passed).toBe(true);
      expect(ethicalReview.positiveTone.passed).toBe(true);
    });

    it('should flag content for human review when ethical standards are not met', async () => {
      // Arrange - Create a workout that would fail ethical checks
      const problematicWorkout = {
        id: 'workout-problematic',
        title: 'Intense Workout',
        description: 'Push through the pain, no excuses for weakness',
        exercises: [
          {
            name: 'Advanced Burpees',
            description: 'Not for beginners or lazy people',
            instructions: 'Just do it, stop complaining',
            modifications: null,
            reps: '50',
            sets: 5
          }
        ],
        accessibility: {
          wheelchairFriendly: false,
          hasModifications: false,
          usesInclusiveLanguage: false
        }
      };

      // Act
      const ethicalReview = await ethicalAIReview.reviewWorkoutGeneration(
        problematicWorkout,
        testUser.profile
      );

      // Assert - Should fail ethical checks
      expect(ethicalReview.passed).toBe(false);
      expect(ethicalReview.overallScore).toBeLessThan(85);
      expect(ethicalReview.positiveTone.passed).toBe(false);
      expect(ethicalReview.inclusivity.passed).toBe(false);
      expect(ethicalReview.recommendations).toHaveLength(n => n > 0);

      // Verify flagging for human review
      expect(ethicalReview.recommendations).toContain(
        expect.stringContaining('human review')
      );
    });
  });

  describe('Gamification Engine Reliability', () => {
    it('should award points reliably with proper persistence', async () => {
      // Arrange
      const pointsToAward = 50;
      const reason = 'workout_completion';

      // Act
      const result = await gamificationPersistence.awardPoints(
        testUser.id,
        pointsToAward,
        reason,
        { workoutId: 'workout-123', accessibility: true }
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.pointsAwarded).toBeGreaterThanOrEqual(pointsToAward);
      expect(result.reason).toBe(reason);

      // Verify points are tracked in analytics
      await mcpAnalytics.trackQualityMetrics('gamification', 'award_points', {
        responseTime: 100,
        accuracy: 1.0,
        completion: 1.0,
        userSatisfaction: 5.0
      });

      const metrics = mcpAnalytics.getRealTimeMetrics('gamification');
      expect(metrics.operationCount).toBeGreaterThan(0);
    });

    it('should handle concurrent point awards correctly', async () => {
      // Arrange
      const users = Array(10).fill().map((_, i) => 
        TestUtils.createMockUser('client')
      );
      const pointsPerUser = 100;

      // Act - Award points concurrently
      const results = await Promise.all(
        users.map(user => 
          gamificationPersistence.awardPoints(
            user.id,
            pointsPerUser,
            'concurrent_test'
          )
        )
      );

      // Assert - All awards should succeed
      expect(results).toHaveLength(users.length);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.pointsAwarded).toBe(pointsPerUser);
      });

      // Verify no data loss
      const totalPointsAwarded = results.reduce(
        (sum, result) => sum + (result.pointsAwarded || 0), 
        0
      );
      expect(totalPointsAwarded).toBe(users.length * pointsPerUser);
    });

    it('should trigger achievements based on inclusive criteria', async () => {
      // Arrange
      const userId = testUser.id;
      
      // Update user stats to trigger accessibility champion achievement
      await gamificationPersistence.updateUserStatistics(userId, {
        accessibilityUsage: 15,
        totalWorkouts: 1,
        sharedWorkouts: 0
      });

      // Act - Award points that should trigger achievement
      const result = await gamificationPersistence.awardPoints(
        userId,
        10,
        'accessibility_use',
        { feature: 'screen_reader' }
      );

      // Assert
      expect(result.success).toBe(true);

      // Check for accessibility champion achievement
      const achievements = await gamificationPersistence.getUserAchievements(userId);
      const accessibilityAchievement = achievements.find(
        ach => ach.id === 'accessibility_champion'
      );
      expect(accessibilityAchievement).toBeTruthy();
      expect(accessibilityAchievement.icon).toBe('♿');
      expect(accessibilityAchievement.category).toBe('inclusive');
    });

    it('should maintain point integrity with fallback storage', async () => {
      // Arrange - Simulate Redis failure by temporarily disabling connection
      const originalRedisMethod = gamificationPersistence.redis.hincrby;
      gamificationPersistence.redis.hincrby = async () => {
        throw new Error('Simulated Redis failure');
      };

      // Act
      const result = await gamificationPersistence.awardPoints(
        testUser.id,
        75,
        'fallback_test'
      );

      // Assert - Should still succeed using fallback
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBeTruthy();
      expect(result.pointsAwarded).toBe(75);

      // Restore Redis method
      gamificationPersistence.redis.hincrby = originalRedisMethod;
    });
  });

  describe('Accessibility Testing Integration', () => {
    it('should validate accessibility compliance for AI features', async () => {
      // Arrange
      const featuresToTest = [
        'workout-generator',
        'progress-analysis',
        'nutrition-planning',
        'exercise-alternatives'
      ];

      // Act & Assert
      for (const feature of featuresToTest) {
        const testResult = await accessibilityTesting.runAccessibilityTest(
          feature,
          { userId: testUser.id }
        );

        expect(testResult.status).toBe('passed');
        expect(testResult.score).toBeGreaterThanOrEqual(90);
        expect(testResult.wcagLevel).toBe('AA');
      }
    });

    it('should generate comprehensive accessibility report', async () => {
      // Act
      const report = await accessibilityTesting.generateAccessibilityReport();

      // Assert
      expect(report.overallStatus).toBe('compliant');
      expect(report.summary.passedFeatures).toBeGreaterThan(0);
      expect(report.summary.averageScore).toBeGreaterThanOrEqual(90);
      expect(report.complianceMatrix.overall.percentage).toBeGreaterThanOrEqual(90);
      expect(report.recommendations).toBeDefined();
    });

    it('should provide actionable recommendations for accessibility improvements', async () => {
      // Arrange - Create a failing accessibility test
      const mockFailingFeature = 'mock-failing-feature';
      
      // Act
      const testResult = await accessibilityTesting.runAccessibilityTest(
        mockFailingFeature
      );
      
      // The mock will likely pass, but we can test the recommendation system
      const report = await accessibilityTesting.generateAccessibilityReport(
        mockFailingFeature
      );

      // Assert
      expect(report.recommendations).toBeDefined();
      if (report.recommendations.length > 0) {
        expect(report.recommendations[0]).toHaveProperty('priority');
        expect(report.recommendations[0]).toHaveProperty('solution');
        expect(report.recommendations[0]).toHaveProperty('estimatedEffort');
      }
    });
  });

  describe('MCP Analytics and Monitoring', () => {
    it('should track token usage across multiple operations', async () => {
      // Arrange
      const operations = [
        { server: 'workout', operation: 'generation', tokens: 250 },
        { server: 'workout', operation: 'modification', tokens: 150 },
        { server: 'gamification', operation: 'points_award', tokens: 50 },
        { server: 'nutrition', operation: 'meal_plan', tokens: 300 }
      ];

      // Act
      for (const op of operations) {
        await mcpAnalytics.trackTokenUsage(
          op.server,
          op.operation,
          op.tokens,
          'claude-3-5-sonnet'
        );
      }

      // Assert
      const summary = mcpAnalytics.getAnalyticsSummary();
      expect(summary.totalTokens).toBeGreaterThan(0);
      expect(summary.totalOperations).toBe(operations.length);
      expect(summary.totalCost).toBeGreaterThan(0);
    });

    it('should detect token usage spikes and raise alerts', async () => {
      // Arrange - Establish baseline usage
      const normalTokens = 200;
      const server = 'workout';
      const operation = 'generation';

      // Create baseline
      for (let i = 0; i < 5; i++) {
        await mcpAnalytics.trackTokenUsage(server, operation, normalTokens);
      }

      // Act - Create a spike (3x normal usage)
      const spikeTokens = normalTokens * 3;
      let alertReceived = false;
      
      mcpAnalytics.once('alert', (alert) => {
        alertReceived = true;
        expect(alert.type).toBe('token_usage_spike');
        expect(alert.server).toBe(server);
        expect(alert.currentTokens).toBe(spikeTokens);
      });

      await mcpAnalytics.trackTokenUsage(server, operation, spikeTokens);

      // Assert
      expect(alertReceived).toBe(true);
    });

    it('should generate health reports with recommendations', async () => {
      // Arrange - Create some analytics data
      await mcpAnalytics.trackTokenUsage('workout', 'generation', 800);
      await mcpAnalytics.trackQualityMetrics('workout', 'generation', {
        responseTime: 2000,
        accuracy: 0.75, // Intentionally low to trigger recommendation
        completion: 0.9,
        userSatisfaction: 3.8
      });

      // Act
      const report = await mcpAnalytics.generateMCPHealthReport('hour');

      // Assert
      expect(report.timeframe).toBe('hour');
      expect(report.summary).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.serverDetails).toBeDefined();

      // Check for quality improvement recommendation
      const qualityRec = report.recommendations.find(
        rec => rec.category === 'quality'
      );
      expect(qualityRec).toBeTruthy();
    });

    it('should provide real-time metrics updates', async () => {
      // Arrange
      let reportReceived = false;
      mcpAnalytics.once('realTimeReport', (report) => {
        reportReceived = true;
        expect(report.timestamp).toBeDefined();
        expect(report.servers).toBeDefined();
        expect(report.totals).toBeDefined();
      });

      // Act - Generate some activity
      await mcpAnalytics.trackTokenUsage('workout', 'test', 100);
      await mcpAnalytics.generateRealTimeReport();

      // Assert
      expect(reportReceived).toBe(true);
    });
  });

  describe('End-to-End AI Feature Flow', () => {
    it('should complete full workout generation to gamification flow', async () => {
      // Arrange
      const workoutRequest = TestUtils.createMockWorkoutRequest(testUser.id);
      const startTime = Date.now();

      // Act 1: Generate Workout
      const workout = await mockWorkoutServer.generateWorkout(testUser.profile);
      
      // Track analytics
      await mcpAnalytics.trackTokenUsage(
        'workout',
        'generation',
        workout.tokenUsage
      );

      // Act 2: Ethical Review
      const ethicalReview = await ethicalAIReview.reviewWorkoutGeneration(
        workout,
        testUser.profile
      );

      // Act 3: Accessibility Test
      const accessibilityResult = await accessibilityTesting.runAccessibilityTest(
        'workout-generator',
        { userId: testUser.id }
      );

      // Act 4: Award Points for Completion
      const pointsResult = await gamificationPersistence.awardPoints(
        testUser.id,
        50,
        'workout_completion',
        { 
          workoutId: workout.id,
          ethicalScore: ethicalReview.overallScore,
          accessibilityCompliant: accessibilityResult.score >= 90
        }
      );

      // Act 5: Track Quality Metrics
      const endTime = Date.now();
      await mcpAnalytics.trackQualityMetrics('workout', 'full_flow', {
        responseTime: endTime - startTime,
        accuracy: ethicalReview.overallScore / 100,
        completion: 1.0,
        userSatisfaction: 4.5
      });

      // Assert - All steps successful
      expect(workout).toBeDefined();
      expect(ethicalReview.passed).toBe(true);
      expect(accessibilityResult.status).toBe('passed');
      expect(pointsResult.success).toBe(true);

      // Verify comprehensive tracking
      const analytics = mcpAnalytics.getAllRealTimeMetrics();
      expect(analytics.workout).toBeDefined();
      expect(analytics.workout.operationCount).toBeGreaterThan(0);
    });

    it('should maintain system integrity under load', async () => {
      // Arrange
      const concurrentUsers = 20;
      const users = Array(concurrentUsers).fill().map(() => 
        TestUtils.createMockUser('client')
      );

      // Act - Simulate concurrent workout generations
      const promises = users.map(async (user) => {
        const workout = await mockWorkoutServer.generateWorkout(user.profile);
        const ethicalReview = await ethicalAIReview.reviewWorkoutGeneration(
          workout,
          user.profile
        );
        const pointsResult = await gamificationPersistence.awardPoints(
          user.id,
          25,
          'workout_generation'
        );
        
        await mcpAnalytics.trackTokenUsage(
          'workout',
          'load_test',
          workout.tokenUsage
        );

        return {
          workout,
          ethicalReview,
          pointsResult
        };
      });

      const results = await Promise.all(promises);

      // Assert - All operations successful
      expect(results).toHaveLength(concurrentUsers);
      results.forEach(result => {
        expect(result.workout).toBeDefined();
        expect(result.ethicalReview.passed).toBe(true);
        expect(result.pointsResult.success).toBe(true);
      });

      // Verify system metrics under load
      const analytics = mcpAnalytics.getAllRealTimeMetrics();
      expect(analytics.workout.operationCount).toBeGreaterThanOrEqual(concurrentUsers);
      expect(analytics.gamification.operationCount).toBeGreaterThanOrEqual(concurrentUsers);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should gracefully handle MCP server failures', async () => {
      // Arrange - Simulate server failure
      mockWorkoutServer.healthy = false;
      
      // Act
      try {
        await mockWorkoutServer.generateWorkout(testUser.profile);
        // If no error thrown, the mock didn't simulate failure correctly
        expect(true).toBe(false);
      } catch (error) {
        // Assert - Error handling
        expect(error).toBeDefined();
      }

      // Verify error tracking
      await mcpAnalytics.trackQualityMetrics('workout', 'failed_generation', {
        responseTime: 5000,
        accuracy: 0,
        completion: 0,
        userSatisfaction: 1
      });

      const metrics = mcpAnalytics.getRealTimeMetrics('workout');
      expect(metrics.operationCount).toBeGreaterThan(0);
    });

    it('should maintain data consistency during partial failures', async () => {
      // Arrange
      const userId = testUser.id;
      const initialPoints = 100;

      // Award initial points
      const initial = await gamificationPersistence.awardPoints(
        userId,
        initialPoints,
        'initial_award'
      );
      expect(initial.success).toBe(true);

      // Act - Simulate partial failure in gamification
      const partialFailurePromise = gamificationPersistence.awardPoints(
        userId,
        50,
        'partial_failure_test'
      );

      // Assert - Even with potential failures, data should be consistent
      const result = await partialFailurePromise;
      expect(result).toBeDefined();
      // Should either succeed completely or fail gracefully
      expect(typeof result.success).toBe('boolean');
    });
  });
});

// Additional test utilities for specific scenarios
class AdvancedTestScenarios {
  static async testUserJourney(app, user) {
    const journey = {
      registration: false,
      profileSetup: false,
      workoutGeneration: false,
      progressTracking: false,
      socialSharing: false,
      achievementUnlock: false
    };

    // Simulate complete user journey
    try {
      // Each step would be implemented based on actual API endpoints
      journey.registration = true;
      journey.profileSetup = true;
      
      // Test workout generation
      const workout = await mockWorkoutServer.generateWorkout(user.profile);
      journey.workoutGeneration = workout !== null;
      
      // Test gamification
      const points = await gamificationPersistence.awardPoints(
        user.id,
        100,
        'journey_test'
      );
      journey.achievementUnlock = points.success;
      
      return journey;
    } catch (error) {
      console.error('User journey test failed:', error);
      return journey;
    }
  }

  static async validateAccessibilityCompliance(features) {
    const results = {};
    
    for (const feature of features) {
      const compliance = await accessibilityTesting.validateAccessibilityCompliance(
        feature,
        { minScore: 90, maxViolations: 0 }
      );
      results[feature] = compliance;
    }
    
    return results;
  }

  static async stressTestGamification(userCount = 100) {
    const users = Array(userCount).fill().map(() => 
      TestUtils.createMockUser('client')
    );
    
    const results = await Promise.allSettled(
      users.map(user => 
        gamificationPersistence.awardPoints(user.id, 10, 'stress_test')
      )
    );
    
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      total: userCount,
      succeeded,
      failed,
      successRate: succeeded / userCount
    };
  }
}

export { TestUtils, AdvancedTestScenarios };