/**
 * AI Features Integration Test Script
 * Tests all AI features to ensure they're working correctly
 */

const fetch = require('node-fetch');
const fs = require('fs');

// Configuration
const API_BASE = 'http://localhost:5000';
const FRONTEND_BASE = 'http://localhost:5173';

// Test data
const TEST_CLIENT_ID = '1'; // Replace with actual client ID
const TEST_TOKEN = process.env.TEST_TOKEN || 'your-test-token-here';

class AIFeaturesTester {
  constructor() {
    this.results = {
      mcpStatus: false,
      workoutGeneration: false,
      progressAnalysis: false,
      nutritionPlanning: false,
      exerciseAlternatives: false,
      gamification: false
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testMCPStatus() {
    console.log('🔍 Testing MCP Server Status...');
    try {
      const response = await fetch(`${API_BASE}/api/mcp/status`);
      const data = await response.json();
      
      const workoutOnline = data.servers?.workout?.status === 'online';
      const gamificationOnline = data.servers?.gamification?.status === 'online';
      
      this.results.mcpStatus = workoutOnline || gamificationOnline;
      
      console.log(`  ✅ Workout MCP: ${workoutOnline ? 'Online' : 'Offline'}`);
      console.log(`  ✅ Gamification MCP: ${gamificationOnline ? 'Online' : 'Offline'}`);
      
      return this.results.mcpStatus;
    } catch (error) {
      console.log(`  ❌ MCP Status Error: ${error.message}`);
      return false;
    }
  }

  async testWorkoutGeneration() {
    console.log('🏋️  Testing Workout Generation...');
    try {
      const response = await fetch(`${API_BASE}/api/mcp/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify({
          modelName: 'claude-3-5-sonnet',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: 'You are a fitness expert. Generate a simple workout plan.',
          humanMessage: 'Create a 30-minute full body workout for intermediate level.',
          mcpContext: {
            clientId: TEST_CLIENT_ID,
            workoutType: 'full_body',
            duration: 30,
            equipment: ['dumbbells', 'bodyweight']
          }
        })
      });

      const data = await response.json();
      this.results.workoutGeneration = data.success && data.content;
      
      console.log(`  ${this.results.workoutGeneration ? '✅' : '❌'} Workout Generation: ${this.results.workoutGeneration ? 'Success' : 'Failed'}`);
      
      if (data.content) {
        console.log(`  📝 Generated ${data.content.length} characters of workout content`);
      }
      
      return this.results.workoutGeneration;
    } catch (error) {
      console.log(`  ❌ Workout Generation Error: ${error.message}`);
      return false;
    }
  }

  async testProgressAnalysis() {
    console.log('📊 Testing Progress Analysis...');
    try {
      const response = await fetch(`${API_BASE}/api/mcp/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify({
          modelName: 'claude-3-5-sonnet',
          temperature: 0.3,
          maxTokens: 2000,
          systemPrompt: 'You are a fitness analyst. Analyze client progress data.',
          humanMessage: 'Analyze the client progress for the last 3 months.',
          mcpContext: {
            clientId: TEST_CLIENT_ID,
            timeframe: '3months',
            metrics: ['strength', 'endurance', 'consistency']
          }
        })
      });

      const data = await response.json();
      this.results.progressAnalysis = data.success && data.content;
      
      console.log(`  ${this.results.progressAnalysis ? '✅' : '❌'} Progress Analysis: ${this.results.progressAnalysis ? 'Success' : 'Failed'}`);
      
      return this.results.progressAnalysis;
    } catch (error) {
      console.log(`  ❌ Progress Analysis Error: ${error.message}`);
      return false;
    }
  }

  async testNutritionPlanning() {
    console.log('🍎 Testing Nutrition Planning...');
    try {
      const response = await fetch(`${API_BASE}/api/mcp/nutrition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify({
          modelName: 'claude-3-5-sonnet',
          temperature: 0.6,
          maxTokens: 2000,
          systemPrompt: 'You are a nutrition expert. Create personalized meal plans.',
          humanMessage: 'Create a nutrition plan for muscle gain.',
          mcpContext: {
            clientId: TEST_CLIENT_ID,
            goal: 'muscle_gain',
            activityLevel: 'moderate',
            restrictions: ['vegetarian']
          }
        })
      });

      const data = await response.json();
      this.results.nutritionPlanning = data.success && data.content;
      
      console.log(`  ${this.results.nutritionPlanning ? '✅' : '❌'} Nutrition Planning: ${this.results.nutritionPlanning ? 'Success' : 'Failed'}`);
      
      return this.results.nutritionPlanning;
    } catch (error) {
      console.log(`  ❌ Nutrition Planning Error: ${error.message}`);
      return false;
    }
  }

  async testExerciseAlternatives() {
    console.log('🔄 Testing Exercise Alternatives...');
    try {
      const response = await fetch(`${API_BASE}/api/mcp/alternatives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify({
          modelName: 'claude-3-5-sonnet',
          temperature: 0.5,
          maxTokens: 2000,
          systemPrompt: 'You are a fitness expert. Provide exercise alternatives.',
          humanMessage: 'Find alternatives for barbell squats.',
          mcpContext: {
            exercise: {
              name: 'Barbell Squat',
              targetMuscles: ['Quadriceps', 'Glutes'],
              equipment: ['Barbell']
            },
            limitations: ['knee_problems'],
            availableEquipment: ['dumbbells', 'bodyweight']
          }
        })
      });

      const data = await response.json();
      this.results.exerciseAlternatives = data.success && data.content;
      
      console.log(`  ${this.results.exerciseAlternatives ? '✅' : '❌'} Exercise Alternatives: ${this.results.exerciseAlternatives ? 'Success' : 'Failed'}`);
      
      return this.results.exerciseAlternatives;
    } catch (error) {
      console.log(`  ❌ Exercise Alternatives Error: ${error.message}`);
      return false;
    }
  }

  async testGamification() {
    console.log('🎮 Testing Gamification...');
    try {
      const response = await fetch(`${API_BASE}/api/mcp/gamification/award-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify({
          clientId: TEST_CLIENT_ID,
          points: 100,
          reason: 'Completed workout'
        })
      });

      const data = await response.json();
      this.results.gamification = data.success;
      
      console.log(`  ${this.results.gamification ? '✅' : '❌'} Gamification: ${this.results.gamification ? 'Success' : 'Failed'}`);
      
      return this.results.gamification;
    } catch (error) {
      console.log(`  ❌ Gamification Error: ${error.message}`);
      return false;
    }
  }

  async testFrontendAccess() {
    console.log('🖥️  Testing Frontend Access...');
    try {
      const response = await fetch(FRONTEND_BASE);
      const frontendAccessible = response.status === 200;
      
      console.log(`  ${frontendAccessible ? '✅' : '❌'} Frontend: ${frontendAccessible ? 'Accessible' : 'Not accessible'}`);
      
      return frontendAccessible;
    } catch (error) {
      console.log(`  ❌ Frontend Access Error: ${error.message}`);
      return false;
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📋 AI FEATURES TEST REPORT');
    console.log('='.repeat(50));
    
    const totalTests = Object.keys(this.results).length;
    const passedTests = Object.values(this.results).filter(Boolean).length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n📊 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
    console.log('\n🔍 Detailed Results:');
    
    Object.entries(this.results).forEach(([test, passed]) => {
      const icon = passed ? '✅' : '❌';
      const status = passed ? 'PASS' : 'FAIL';
      console.log(`  ${icon} ${test.padEnd(20)} ${status}`);
    });
    
    console.log('\n💡 Recommendations:');
    
    if (!this.results.mcpStatus) {
      console.log('  - Check if MCP servers are running (ports 8000, 8002)');
      console.log('  - Verify MCP server installation and dependencies');
    }
    
    if (!this.results.workoutGeneration) {
      console.log('  - Ensure Workout MCP server is properly configured');
      console.log('  - Check authentication and API permissions');
    }
    
    if (successRate < 100) {
      console.log('  - Review error messages above for specific issues');
      console.log('  - Check server logs for detailed error information');
      console.log('  - Ensure all environment variables are properly set');
    } else {
      console.log('  🎉 All AI features are working correctly!');
      console.log('  🚀 Your AI-powered fitness platform is ready to use!');
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Save report to file
    const reportData = {
      timestamp: new Date().toISOString(),
      results: this.results,
      successRate,
      recommendations: successRate < 100 ? 'Check failed tests and review error logs' : 'All systems operational'
    };
    
    fs.writeFileSync('ai-features-test-report.json', JSON.stringify(reportData, null, 2));
    console.log('📁 Report saved to: ai-features-test-report.json');
  }

  async runAllTests() {
    console.log('🚀 Starting AI Features Integration Tests...\n');
    
    await this.delay(1000);
    await this.testFrontendAccess();
    
    await this.delay(1000);
    await this.testMCPStatus();
    
    if (this.results.mcpStatus) {
      await this.delay(2000);
      await this.testWorkoutGeneration();
      
      await this.delay(2000);
      await this.testProgressAnalysis();
      
      await this.delay(2000);
      await this.testNutritionPlanning();
      
      await this.delay(2000);
      await this.testExerciseAlternatives();
      
      await this.delay(2000);
      await this.testGamification();
    } else {
      console.log('\n⚠️  Skipping AI feature tests - MCP servers are offline');
    }
    
    this.generateReport();
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new AIFeaturesTester();
  tester.runAllTests().catch(console.error);
}

module.exports = AIFeaturesTester;