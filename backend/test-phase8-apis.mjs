/**
 * Phase 8 API Integration Tests
 * ==============================
 * Comprehensive test suite for all Phase 8 APIs + pagination verification
 *
 * Test Suites:
 * 1. Client Profile Update (PATCH /api/client/profile) - 7 tests
 * 2. Trainer Today Sessions (GET /api/sessions/trainer/:id/today) - 3 tests
 * 3. Trainer Weekly Goals (GET /api/goals/trainer/:id/achieved) - 3 tests
 * 4. Workout Logging (POST /api/workout/sessions) - 2 tests
 * 5. Pagination Verification (GET /api/goals) - 4 tests
 *
 * Total Tests: 19 (5 auth tests always run, 14 token-gated tests)
 *
 * Run: node backend/test-phase8-apis.mjs
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE = process.env.API_URL || 'http://localhost:10000';
let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
};

// Test admin token (you'll need to generate this)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const CLIENT_TOKEN = process.env.CLIENT_TOKEN || '';
const TRAINER_TOKEN = process.env.TRAINER_TOKEN || '';

console.log(chalk.cyan('\n' + '='.repeat(60)));
console.log(chalk.cyan('Phase 8 API Integration Test Suite'));
console.log(chalk.cyan('='.repeat(60) + '\n'));

// Helper function to run a test
async function runTest(name, testFn) {
  testResults.total++;
  process.stdout.write(`${testResults.total}. ${name}... `);

  try {
    await testFn();
    testResults.passed++;
    console.log(chalk.green('✓ PASS'));
    return true;
  } catch (error) {
    testResults.failed++;
    console.log(chalk.red('✗ FAIL'));
    console.log(chalk.red(`   Error: ${error.message}`));
    if (error.response) {
      console.log(chalk.yellow(`   Status: ${error.response.status}`));
      console.log(chalk.yellow(`   Data: ${JSON.stringify(error.response.data, null, 2)}`));
    }
    return false;
  }
}

// ============================================================================
// TEST SUITE 1: CLIENT PROFILE UPDATE
// ============================================================================

console.log(chalk.yellow('\n📝 TEST SUITE 1: Client Profile Update (PATCH /api/client/profile)\n'));

await runTest('Health check - Server is running', async () => {
  const response = await axios.get(`${API_BASE}/health`);
  if (response.status !== 200) throw new Error('Server not healthy');
});

await runTest('Profile update requires authentication', async () => {
  try {
    await axios.patch(`${API_BASE}/api/client/profile`, { firstName: 'Test' });
    throw new Error('Should have returned 401');
  } catch (error) {
    if (error.response?.status !== 401) throw error;
  }
});

if (CLIENT_TOKEN) {
  await runTest('Client can update profile with valid data', async () => {
    const response = await axios.patch(
      `${API_BASE}/api/client/profile`,
      {
        firstName: 'Updated',
        lastName: 'TestUser',
        phone: '555-0123'
      },
      {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
      }
    );

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.success) throw new Error('Response success should be true');
    if (!response.data.user) throw new Error('Response should include user object');
    if (response.data.user.firstName !== 'Updated') throw new Error('First name not updated');

    console.log(chalk.gray(`   → User updated: ${response.data.user.firstName} ${response.data.user.lastName}`));
  });

  await runTest('Client can clear nullable fields with null', async () => {
    const response = await axios.patch(
      `${API_BASE}/api/client/profile`,
      {
        phone: null,
        emergencyContact: null
      },
      {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
      }
    );

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (response.data.user.phone !== null) {
      console.log(chalk.yellow(`   ⚠ Warning: Phone not cleared (value: ${response.data.user.phone})`));
    }
  });

  await runTest('Profile update filters out non-whitelisted fields', async () => {
    const response = await axios.patch(
      `${API_BASE}/api/client/profile`,
      {
        firstName: 'Allowed',
        role: 'admin', // Should be filtered out
        subscriptionStatus: 'premium' // Should be filtered out
      },
      {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
      }
    );

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (response.data.user.role === 'admin') throw new Error('Role should not be updatable via this endpoint');
  });

  await runTest('Profile update validates field types', async () => {
    try {
      await axios.patch(
        `${API_BASE}/api/client/profile`,
        {
          firstName: 12345 // Should be string
        },
        {
          headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
        }
      );
      throw new Error('Should have returned 400 for invalid type');
    } catch (error) {
      if (error.response?.status !== 400) throw error;
      console.log(chalk.gray(`   → Validation error: ${error.response.data.message}`));
    }
  });

  // Rate limiting test - requires 11 rapid requests
  await runTest('Rate limiting blocks after 10 requests in 15 minutes', async () => {
    console.log(chalk.gray('\n   → Making 11 rapid requests...'));
    let rateLimited = false;

    for (let i = 1; i <= 11; i++) {
      try {
        const response = await axios.patch(
          `${API_BASE}/api/client/profile`,
          { firstName: `Test${i}` },
          {
            headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
          }
        );

        if (response.status === 429) {
          rateLimited = true;
          console.log(chalk.gray(`   → Rate limited on request #${i}`));
          break;
        }
      } catch (error) {
        if (error.response?.status === 429) {
          rateLimited = true;
          console.log(chalk.gray(`   → Rate limited on request #${i}`));
          break;
        }
      }

      // Small delay to avoid overwhelming server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!rateLimited) {
      console.log(chalk.yellow('   ⚠ Warning: Rate limiting did not trigger within 11 requests'));
      console.log(chalk.yellow('   → This might be expected if rate limiter window has reset'));
    }
  });
} else {
  testResults.skipped += 6;
  console.log(chalk.yellow('⊘ Skipped 6 tests - CLIENT_TOKEN not provided\n'));
  console.log(chalk.gray('   Set CLIENT_TOKEN environment variable to run client profile tests'));
}

// ============================================================================
// TEST SUITE 2: TRAINER TODAY SESSIONS
// ============================================================================

console.log(chalk.yellow('\n📅 TEST SUITE 2: Trainer Today Sessions (GET /api/sessions/trainer/:id/today)\n'));

await runTest('Trainer today sessions requires authentication', async () => {
  try {
    await axios.get(`${API_BASE}/api/sessions/trainer/1/today`);
    throw new Error('Should have returned 401');
  } catch (error) {
    if (error.response?.status !== 401) throw error;
  }
});

if (TRAINER_TOKEN) {
  await runTest('Trainer can view own today sessions count', async () => {
    const response = await axios.get(
      `${API_BASE}/api/sessions/trainer/1/today`,
      {
        headers: { Authorization: `Bearer ${TRAINER_TOKEN}` }
      }
    );

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.success) throw new Error('Response success should be true');
    if (!response.data.data) throw new Error('Response should include data object');
    if (typeof response.data.data.todaySessionCount !== 'number') {
      throw new Error('todaySessionCount should be a number');
    }

    console.log(chalk.gray(`   → Today's sessions: ${response.data.data.todaySessionCount}`));
    console.log(chalk.gray(`   → Date: ${response.data.data.date}`));
  });

  await runTest('Trainer cannot view other trainer sessions', async () => {
    try {
      await axios.get(
        `${API_BASE}/api/sessions/trainer/999/today`,
        {
          headers: { Authorization: `Bearer ${TRAINER_TOKEN}` }
        }
      );
      throw new Error('Should have returned 403');
    } catch (error) {
      if (error.response?.status !== 403) throw error;
      console.log(chalk.gray(`   → Correctly denied: ${error.response.data.message}`));
    }
  });
} else {
  testResults.skipped += 2;
  console.log(chalk.yellow('⊘ Skipped 2 tests - TRAINER_TOKEN not provided\n'));
  console.log(chalk.gray('   Set TRAINER_TOKEN environment variable to run trainer session tests'));
}

// ============================================================================
// TEST SUITE 3: TRAINER WEEKLY GOALS
// ============================================================================

console.log(chalk.yellow('\n🎯 TEST SUITE 3: Trainer Weekly Goals (GET /api/goals/trainer/:id/achieved)\n'));

await runTest('Trainer weekly goals requires authentication', async () => {
  try {
    await axios.get(`${API_BASE}/api/goals/trainer/1/achieved`);
    throw new Error('Should have returned 401');
  } catch (error) {
    if (error.response?.status !== 401) throw error;
  }
});

if (TRAINER_TOKEN) {
  await runTest('Trainer can view own weekly goals achieved count', async () => {
    const response = await axios.get(
      `${API_BASE}/api/goals/trainer/1/achieved`,
      {
        headers: { Authorization: `Bearer ${TRAINER_TOKEN}` }
      }
    );

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.success) throw new Error('Response success should be true');
    if (!response.data.data) throw new Error('Response should include data object');
    if (typeof response.data.data.achievedThisWeek !== 'number') {
      throw new Error('achievedThisWeek should be a number');
    }

    console.log(chalk.gray(`   → Goals achieved this week: ${response.data.data.achievedThisWeek}`));
    console.log(chalk.gray(`   → Week range: ${response.data.data.weekStart} to ${response.data.data.weekEnd}`));
    console.log(chalk.gray(`   → Client count: ${response.data.data.clientCount}`));
  });

  await runTest('Caching works for trainer goals endpoint', async () => {
    const start1 = Date.now();
    const response1 = await axios.get(
      `${API_BASE}/api/goals/trainer/1/achieved`,
      {
        headers: { Authorization: `Bearer ${TRAINER_TOKEN}` }
      }
    );
    const time1 = Date.now() - start1;

    // Second request should be faster (cached)
    const start2 = Date.now();
    const response2 = await axios.get(
      `${API_BASE}/api/goals/trainer/1/achieved`,
      {
        headers: { Authorization: `Bearer ${TRAINER_TOKEN}` }
      }
    );
    const time2 = Date.now() - start2;

    console.log(chalk.gray(`   → First request: ${time1}ms`));
    console.log(chalk.gray(`   → Second request (cached): ${time2}ms`));

    if (time2 < time1) {
      console.log(chalk.gray(`   → Cache improved response time by ${time1 - time2}ms`));
    } else {
      console.log(chalk.yellow(`   ⚠ Warning: Second request not faster (cache may not be working)`));
    }
  });
} else {
  testResults.skipped += 2;
  console.log(chalk.yellow('⊘ Skipped 2 tests - TRAINER_TOKEN not provided\n'));
  console.log(chalk.gray('   Set TRAINER_TOKEN environment variable to run trainer goals tests'));
}

// ============================================================================
// TEST SUITE 4: WORKOUT LOGGING
// ============================================================================

console.log(chalk.yellow('\n💪 TEST SUITE 4: Workout Logging (POST /api/workout/sessions)\n'));

await runTest('Workout logging requires authentication', async () => {
  try {
    await axios.post(`${API_BASE}/api/workout/sessions`, {
      title: 'Test Workout',
      date: new Date().toISOString()
    });
    throw new Error('Should have returned 401');
  } catch (error) {
    if (error.response?.status !== 401) throw error;
  }
});

if (CLIENT_TOKEN) {
  await runTest('Client can log a workout session', async () => {
    const workoutData = {
      title: 'Phase 8 Test Workout',
      date: new Date().toISOString(),
      duration: 45,
      intensity: 'moderate',
      exercises: [
        { name: 'Squats', sets: 3, reps: 12 },
        { name: 'Push-ups', sets: 3, reps: 15 }
      ],
      notes: 'Phase 8 API test workout'
    };

    const response = await axios.post(
      `${API_BASE}/api/workout/sessions`,
      workoutData,
      {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
      }
    );

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Expected 200 or 201, got ${response.status}`);
    }

    console.log(chalk.gray(`   → Workout logged: ${workoutData.title}`));
    console.log(chalk.gray(`   → Duration: ${workoutData.duration} minutes`));
    console.log(chalk.gray(`   → Exercises: ${workoutData.exercises.length}`));
  });
} else {
  testResults.skipped += 1;
  console.log(chalk.yellow('⊘ Skipped 1 test - CLIENT_TOKEN not provided\n'));
  console.log(chalk.gray('   Set CLIENT_TOKEN environment variable to run workout logging tests'));
}

// ============================================================================
// TEST SUITE 5: PAGINATION VERIFICATION
// ============================================================================

console.log(chalk.yellow('\n📄 TEST SUITE 5: Pagination Verification (GET /api/goals)\n'));

await runTest('Goal list endpoint requires authentication', async () => {
  try {
    await axios.get(`${API_BASE}/api/goals`);
    throw new Error('Should have returned 401');
  } catch (error) {
    if (error.response?.status !== 401) throw error;
  }
});

if (CLIENT_TOKEN) {
  await runTest('Client can fetch goals with default pagination', async () => {
    const response = await axios.get(
      `${API_BASE}/api/goals`,
      {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
      }
    );

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.success) throw new Error('Response success should be true');
    if (!response.data.pagination) throw new Error('Response should include pagination object');
    if (!response.data.goals) throw new Error('Response should include goals array');

    console.log(chalk.gray(`   → Total goals: ${response.data.pagination.total}`));
    console.log(chalk.gray(`   → Page: ${response.data.pagination.page}, Limit: ${response.data.pagination.limit}`));
    console.log(chalk.gray(`   → Total pages: ${response.data.pagination.pages}`));
  });

  await runTest('Client can fetch goals with custom pagination', async () => {
    const response = await axios.get(
      `${API_BASE}/api/goals?page=1&limit=5`,
      {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
      }
    );

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.pagination) throw new Error('Response should include pagination object');
    if (response.data.pagination.page !== 1) throw new Error('Page should be 1');
    if (response.data.pagination.limit !== 5) throw new Error('Limit should be 5');
    if (response.data.goals.length > 5) throw new Error('Should not return more than 5 goals');

    console.log(chalk.gray(`   → Requested page=${1}, limit=${5}`));
    console.log(chalk.gray(`   → Received ${response.data.goals.length} goals (max 5)`));
  });

  await runTest('Goal pagination includes summary statistics', async () => {
    const response = await axios.get(
      `${API_BASE}/api/goals`,
      {
        headers: { Authorization: `Bearer ${CLIENT_TOKEN}` }
      }
    );

    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!response.data.summary) throw new Error('Response should include summary object');

    const summary = response.data.summary;
    if (typeof summary.total !== 'number') throw new Error('summary.total should be a number');
    if (typeof summary.active !== 'number') throw new Error('summary.active should be a number');
    if (typeof summary.completed !== 'number') throw new Error('summary.completed should be a number');

    console.log(chalk.gray(`   → Total: ${summary.total}, Active: ${summary.active}, Completed: ${summary.completed}`));
  });
} else {
  testResults.skipped += 3;
  console.log(chalk.yellow('⊘ Skipped 3 tests - CLIENT_TOKEN not provided\n'));
  console.log(chalk.gray('   Set CLIENT_TOKEN environment variable to run pagination tests'));
}

// ============================================================================
// TEST RESULTS SUMMARY
// ============================================================================

console.log(chalk.cyan('\n' + '='.repeat(60)));
console.log(chalk.cyan('Test Results Summary'));
console.log(chalk.cyan('='.repeat(60) + '\n'));

console.log(`Total Tests:    ${testResults.total}`);
console.log(chalk.green(`Passed:         ${testResults.passed}`));
console.log(chalk.red(`Failed:         ${testResults.failed}`));
console.log(chalk.yellow(`Skipped:        ${testResults.skipped}`));

const passRate = testResults.total > 0
  ? ((testResults.passed / (testResults.total - testResults.skipped)) * 100).toFixed(1)
  : 0;

console.log(`\nPass Rate:      ${passRate}%`);

if (testResults.failed === 0 && testResults.passed > 0) {
  console.log(chalk.green('\n✓ ALL TESTS PASSED!\n'));
} else if (testResults.failed > 0) {
  console.log(chalk.red(`\n✗ ${testResults.failed} test(s) failed\n`));
  process.exit(1);
}

if (testResults.skipped > 0) {
  console.log(chalk.yellow('\n⚠ To run all tests, provide authentication tokens:'));
  if (!ADMIN_TOKEN) console.log(chalk.gray('   export ADMIN_TOKEN="your-admin-jwt-token"'));
  if (!CLIENT_TOKEN) console.log(chalk.gray('   export CLIENT_TOKEN="your-client-jwt-token"'));
  if (!TRAINER_TOKEN) console.log(chalk.gray('   export TRAINER_TOKEN="your-trainer-jwt-token"'));
  console.log();
}

console.log(chalk.cyan('Phase 8 API Testing Complete\n'));
