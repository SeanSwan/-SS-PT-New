/**
 * INTEGRATION TEST SUITE
 * Tests end-to-end workflows across all AI services
 * 
 * Tests:
 * 1. User registration → Gamification → AI services
 * 2. Workout generation → Points awarding → Leaderboard
 * 3. Nutrition planning → Progress tracking → Social sharing
 * 4. Form analysis → Feedback → Exercise alternatives
 * 5. Chatbot → Context persistence → Multi-turn conversations
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Test user data
const testUsers = {
  client: { email: 'test-client@example.com', password: 'test123', role: 'client' },
  trainer: { email: 'test-trainer@example.com', password: 'test123', role: 'trainer' }
};

// Session storage
const sessions = {
  client: null,
  trainer: null
};

// Helper: API request with auth
async function apiRequest(endpoint, method = 'GET', data = null, user = 'client') {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (sessions[user]) {
    headers['Authorization'] = `Bearer ${sessions[user]}`;
  }
  
  try {
    const response = await axios({
      method,
      url: `${API_BASE}${endpoint}`,
      data,
      headers,
      validateStatus: () => true
    });
    return response;
  } catch (error) {
    return { status: 500, data: { error: error.message } };
  }
}

// Test 1: Complete User Journey (Registration → Gamification → AI)
async function testCompleteUserJourney() {
  console.log('\n🧪 Test 1: Complete User Journey');
  
  const results = [];
  
  // Step 1: Register new user
  const registerRes = await apiRequest('/api/auth/register', 'POST', {
    email: `journey-${Date.now()}@test.com`,
    password: 'test123',
    firstName: 'Journey',
    lastName: 'Test',
    role: 'client'
  }, 'client');
  
  results.push({
    step: 'Registration',
    status: registerRes.status === 201 ? '✅' : '❌',
    time: 'N/A'
  });
  
  if (registerRes.status === 201) {
    const userId = registerRes.data.user.id;
    
    // Step 2: Login to get token
    const loginRes = await apiRequest('/api/auth/login', 'POST', {
      email: `journey-${Date.now()}@test.com`,
      password: 'test123'
    }, 'client');
    
    results.push({
      step: 'Login',
      status: loginRes.status === 200 ? '✅' : '❌',
      time: 'N/A'
    });
    
    if (loginRes.status === 200) {
      const token = loginRes.data.token;
      sessions.client = token;
      
      // Step 3: Check initial gamification points (should be 0)
      const pointsRes = await apiRequest('/api/gamification/points', 'GET', null, 'client');
      results.push({
        step: 'Initial Points',
        status: pointsRes.status === 200 && pointsRes.data.points === 0 ? '✅' : '❌',
        value: pointsRes.data?.points
      });
      
      // Step 4: Generate workout (should award points)
      const workoutRes = await apiRequest('/api/ai/workout/generate', 'POST', {
        userId: userId,
        focus: 'full-body',
        duration: 50
      }, 'client');
      
      results.push({
        step: 'Generate Workout',
        status: workoutRes.status === 200 ? '✅' : '❌',
        pointsAwarded: workoutRes.data?.pointsAwarded || 0
      });
      
      // Step 5: Check points after workout
      const newPointsRes = await apiRequest('/api/gamification/points', 'GET', null, 'client');
      results.push({
        step: 'Points After Workout',
        status: newPointsRes.status === 200 && newPointsRes.data.points > 0 ? '✅' : '❌',
        value: newPointsRes.data?.points
      });
      
      // Step 6: Check leaderboard
      const leaderboardRes = await apiRequest('/api/gamification/leaderboard', 'GET', null, 'client');
      results.push({
        step: 'Leaderboard',
        status: leaderboardRes.status === 200 ? '✅' : '❌',
        position: leaderboardRes.data?.position
      });
    }
  }
  
  console.table(results);
  return results;
}

// Test 2: Nutrition & Progress Tracking
async function testNutritionWorkflow() {
  console.log('\n🧪 Test 2: Nutrition & Progress Tracking');
  
  const results = [];
  
  // Step 1: Generate nutrition plan
  const planRes = await apiRequest('/api/ai/nutrition/plan', 'POST', {
    userId: 'test-user',
    goal: 'weight-loss',
    calories: 2000,
    dietaryRestrictions: ['gluten-free']
  }, 'client');
  
  results.push({
    step: 'Generate Plan',
    status: planRes.status === 200 ? '✅' : '❌',
    meals: planRes.data?.meals?.length || 0
  });
  
  if (planRes.status === 200) {
    // Step 2: Log a meal
    const mealLogRes = await apiRequest('/api/nutrition/log', 'POST', {
      meal: 'Breakfast',
      foods: [{ name: 'Oatmeal', calories: 300, protein: 10 }],
      date: new Date().toISOString().split('T')[0]
    }, 'client');
    
    results.push({
      step: 'Log Meal',
      status: mealLogRes.status === 201 ? '✅' : '❌'
    });
    
    // Step 3: Get weekly summary
    const summaryRes = await apiRequest('/api/nutrition/summary', 'GET', null, 'client');
    results.push({
      step: 'Weekly Summary',
      status: summaryRes.status === 200 ? '✅' : '❌',
      totalCalories: summaryRes.data?.totalCalories || 0
    });
    
    // Step 4: Get supplement recommendations
    const supplementRes = await apiRequest('/api/nutrition/supplements', 'GET', null, 'client');
    results.push({
      step: 'Supplement Recs',
      status: supplementRes.status === 200 ? '✅' : '❌',
      supplements: supplementRes.data?.length || 0
    });
  }
  
  console.table(results);
  return results;
}

// Test 3: Form Analysis & Exercise Alternatives
async function testFormAnalysisWorkflow() {
  console.log('\n🧪 Test 3: Form Analysis & Alternatives');
  
  const results = [];
  
  // Step 1: Upload video for analysis
  const uploadRes = await apiRequest('/api/ai/form/analyze', 'POST', {
    videoUrl: 'https://test-video.com/squat.mp4',
    exercise: 'squat',
    userId: 'test-user'
  }, 'client');
  
  results.push({
    step: 'Video Upload',
    status: uploadRes.status === 200 ? '✅' : '❌',
    analysisId: uploadRes.data?.analysisId
  });
  
  if (uploadRes.status === 200) {
    // Step 2: Get analysis results
    const analysisRes = await apiRequest(`/api/ai/form/results/${uploadRes.data.analysisId}`, 'GET', null, 'client');
    results.push({
      step: 'Analysis Results',
      status: analysisRes.status === 200 ? '✅' : '❌',
      issues: analysisRes.data?.issues?.length || 0
    });
    
    // Step 3: Get exercise alternatives (for knee injury)
    const altRes = await apiRequest('/api/ai/alternatives', 'POST', {
      exercise: 'squat',
      injury: 'knee',
      equipment: ['dumbbells', 'resistance-bands']
    }, 'client');
    
    results.push({
      step: 'Exercise Alternatives',
      status: altRes.status === 200 ? '✅' : '❌',
      alternatives: altRes.data?.alternatives?.length || 0
    });
    
    // Step 4: Log corrected exercise
    const logRes = await apiRequest('/api/workouts/log', 'POST', {
      exercise: 'goblet-squat',
      sets: 3,
      reps: 12,
      weight: 20,
      notes: 'Modified for knee safety'
    }, 'client');
    
    results.push({
      step: 'Log Corrected Exercise',
      status: logRes.status === 201 ? '✅' : '❌'
    });
  }
  
  console.table(results);
  return results;
}

// Test 4: Chatbot Multi-Turn Conversation
async function testChatbotWorkflow() {
  console.log('\n🧪 Test 4: Chatbot Multi-Turn Conversation');
  
  const results = [];
  
  // Turn 1: Initial question
  const turn1 = await apiRequest('/api/ai/chat', 'POST', {
    message: 'What is a good leg workout?',
    context: {}
  }, 'client');
  
  results.push({
    turn: 1,
    status: turn1.status === 200 ? '✅' : '❌',
    responseLength: turn1.data?.response?.length || 0
  });
  
  if (turn1.status === 200) {
    const context = turn1.data.context;
    
    // Turn 2: Follow-up question
    const turn2 = await apiRequest('/api/ai/chat', 'POST', {
      message: 'Can you make it easier for beginners?',
      context: context
    }, 'client');
    
    results.push({
      turn: 2,
      status: turn2.status === 200 ? '✅' : '❌',
      contextPreserved: turn2.data?.context?.conversationId === context.conversationId
    });
    
    // Turn 3: Specific request
    const turn3 = await apiRequest('/api/ai/chat', 'POST', {
      message: 'Add alternatives for knee pain',
      context: turn2.data.context
    }, 'client');
    
    results.push({
      turn: 3,
      status: turn3.status === 200 ? '✅' : '❌',
      hasAlternatives: turn3.data?.response?.toLowerCase().includes('alternative')
    });
    
    // Turn 4: Save conversation
    const saveRes = await apiRequest('/api/ai/chat/save', 'POST', {
      conversationId: turn3.data.context.conversationId,
      title: 'Leg Workout Discussion'
    }, 'client');
    
    results.push({
      turn: 4,
      status: saveRes.status === 200 ? '✅' : '❌'
    });
  }
  
  console.table(results);
  return results;
}

// Test 5: Trainer-Client Interaction
async function testTrainerClientInteraction() {
  console.log('\n🧪 Test 5: Trainer-Client Interaction');
  
  const results = [];
  
  // Step 1: Trainer login
  const trainerLogin = await apiRequest('/api/auth/login', 'POST', {
    email: testUsers.trainer.email,
    password: testUsers.trainer.password
  }, 'trainer');
  
  results.push({
    step: 'Trainer Login',
    status: trainerLogin.status === 200 ? '✅' : '❌'
  });
  
  if (trainerLogin.status === 200) {
    sessions.trainer = trainerLogin.data.token;
    
    // Step 2: Get assigned clients
    const clientsRes = await apiRequest('/api/trainer/clients', 'GET', null, 'trainer');
    results.push({
      step: 'Get Clients',
      status: clientsRes.status === 200 ? '✅' : '❌',
      count: clientsRes.data?.clients?.length || 0
    });
    
    // Step 3: Assign workout to client
    const assignRes = await apiRequest('/api/trainer/assign-workout', 'POST', {
      clientId: 'test-client-id',
      workout: {
        name: 'Custom Leg Day',
        exercises: ['squat', 'lunge', 'deadlift']
      }
    }, 'trainer');
    
    results.push({
      step: 'Assign Workout',
      status: assignRes.status === 201 ? '✅' : '❌'
    });
    
    // Step 4: Award bonus points
    const bonusRes = await apiRequest('/api/trainer/award-points', 'POST', {
      clientId: 'test-client-id',
      points: 50,
      reason: 'Excellent form on squats'
    }, 'trainer');
    
    results.push({
      step: 'Award Bonus Points',
      status: bonusRes.status === 200 ? '✅' : '❌',
      points: bonusRes.data?.pointsAwarded || 0
    });
  }
  
  console.table(results);
  return results;
}

// Test 6: Gamification & Social Features
async function testGamificationSocial() {
  console.log('\n🧪 Test 6: Gamification & Social Features');
  
  const results = [];
  
  // Step 1: Get achievements
  const achievementsRes = await apiRequest('/api/gamification/achievements', 'GET', null, 'client');
  results.push({
    step: 'Get Achievements',
    status: achievementsRes.status === 200 ? '✅' : '❌',
    count: achievementsRes.data?.achievements?.length || 0
  });
  
  // Step 2: Share workout
  const shareRes = await apiRequest('/api/social/share', 'POST', {
    type: 'workout',
    content: 'Just crushed leg day! 💪',
    workoutId: 'test-workout-123'
  }, 'client');
  
  results.push({
    step: 'Share Workout',
    status: shareRes.status === 201 ? '✅' : '❌'
  });
  
  // Step 3: Get social feed
  const feedRes = await apiRequest('/api/social/feed', 'GET', null, 'client');
  results.push({
    step: 'Get Social Feed',
    status: feedRes.status === 200 ? '✅' : '❌',
    posts: feedRes.data?.posts?.length || 0
  });
  
  // Step 4: Join challenge
  const challengeRes = await apiRequest('/api/gamification/challenge/join', 'POST', {
    challengeId: 'weekly-step-challenge'
  }, 'client');
  
  results.push({
    step: 'Join Challenge',
    status: challengeRes.status === 200 ? '✅' : '❌'
  });
  
  console.table(results);
  return results;
}

// Test 7: Legal & Compliance
async function testLegalCompliance() {
  console.log('\n🧪 Test 7: Legal & Compliance');
  
  const results = [];
  
  // Step 1: Get AI disclaimer
  const disclaimerRes = await apiRequest('/api/legal/disclaimer', 'GET', null, 'client');
  results.push({
    step: 'Get Disclaimer',
    status: disclaimerRes.status === 200 ? '✅' : '❌',
    hasMedical: disclaimerRes.data?.content?.toLowerCase().includes('medical')
  });
  
  // Step 2: Accept terms
  const acceptRes = await apiRequest('/api/legal/accept', 'POST', {
    disclaimerId: 'ai-usage-v1',
    accepted: true,
    timestamp: new Date().toISOString()
  }, 'client');
  
  results.push({
    step: 'Accept Terms',
    status: acceptRes.status === 200 ? '✅' : '❌'
  });
  
  // Step 3: Check consent status
  const consentRes = await apiRequest('/api/legal/consent', 'GET', null, 'client');
  results.push({
    step: 'Check Consent',
    status: consentRes.status === 200 ? '✅' : '❌',
    accepted: consentRes.data?.accepted || false
  });
  
  // Step 4: Withdraw consent
  const withdrawRes = await apiRequest('/api/legal/withdraw', 'POST', {
    disclaimerId: 'ai-usage-v1'
  }, 'client');
  
  results.push({
    step: 'Withdraw Consent',
    status: withdrawRes.status === 200 ? '✅' : '❌'
  });
  
  console.table(results);
  return results;
}

// Main Test Runner
async function runAllIntegrationTests() {
  console.log('🚀 STARTING INTEGRATION TEST SUITE\n');
  console.log('='.repeat(60));
  
  const allResults = {};
  
  try {
    // Run all integration tests
    allResults.completeUserJourney = await testCompleteUserJourney();
    allResults.nutritionWorkflow = await testNutritionWorkflow();
    allResults.formAnalysisWorkflow = await testFormAnalysisWorkflow();
    allResults.chatbotWorkflow = await testChatbotWorkflow();
    allResults.trainerClientInteraction = await testTrainerClientInteraction();
    allResults.gamificationSocial = await testGamificationSocial();
    allResults.legalCompliance = await testLegalCompliance();
    
    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    
    let totalTests = 0;
    let passedTests = 0;
    
    Object.entries(allResults).forEach(([workflow, steps]) => {
      const passed = steps.filter(s => s.status === '✅').length;
      const total = steps.length;
      totalTests += total;
      passedTests += passed;
      
      console.log(`\n${workflow}: ${passed}/${total} passed`);
    });
    
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`OVERALL: ${passedTests}/${totalTests} (${passRate}%)`);
    console.log('='.repeat(60));
    
    if (parseFloat(passRate) >= 85) {
      console.log('\n🎉 INTEGRATION TESTS PASSED - System ready for production!');
    } else {
      console.log('\n⚠️  Some integration tests failed - review before deployment');
    }
    
    // Save results
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(
      `backend/tests/results/integration-${timestamp}.json`,
      JSON.stringify(allResults, null, 2)
    );
    
    console.log(`\n📄 Detailed results saved to: backend/tests/results/integration-${timestamp}.json`);
    
  } catch (error) {
    console.error('❌ Integration test suite failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllIntegrationTests();
}

export {
  testCompleteUserJourney,
  testNutritionWorkflow,
  testFormAnalysisWorkflow,
  testChatbotWorkflow,
  testTrainerClientInteraction,
  testGamificationSocial,
  testLegalCompliance,
  runAllIntegrationTests
};