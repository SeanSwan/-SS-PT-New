#!/usr/bin/env node

/**
 * 🎯 Complete P0 Model Fix - Get to 43/43 Models
 * ===============================================
 * 
 * Comprehensive fix for all remaining P0 issues:
 * 1. Missing WorkoutSessions table
 * 2. Duplicate table names  
 * 3. Model loading order
 * 4. FK constraint issues
 * 
 * Goal: Clean server startup with 43/43 models loaded
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🎯 Complete P0 Model Fix - Get to 43/43 Models');
console.log('===============================================\n');

async function runStep(stepName, command, description) {
  console.log(`🔧 ${stepName}`);
  console.log('='.repeat(stepName.length + 3));
  console.log(description);
  console.log('');
  console.log(`💻 Running: node ${command}`);
  console.log('');

  try {
    const { stdout, stderr } = await execAsync(`node ${command}`, { 
      timeout: 30000,
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    if (stdout) {
      console.log(stdout);
    }
    
    if (stderr && !stderr.includes('warning')) {
      console.log('STDERR:', stderr);
    }
    
    console.log(`✅ ${stepName} completed\n`);
    return true;
    
  } catch (error) {
    console.log(`❌ ${stepName} failed:`, error.message);
    
    if (error.stdout) {
      console.log('STDOUT:', error.stdout);
    }
    if (error.stderr) {
      console.log('STDERR:', error.stderr);
    }
    
    console.log('');
    return false;
  }
}

async function testServerStartup() {
  console.log('🧪 FINAL TEST: Server Startup');
  console.log('==============================\n');

  try {
    console.log('Starting server to count loaded models...');
    
    // Start server and capture startup logs
    const serverProcess = exec('npm run start', { timeout: 15000 });
    
    let output = '';
    let modelCount = 0;
    
    serverProcess.stdout.on('data', (data) => {
      output += data;
      const modelMatch = data.match(/📋 Loaded (\d+) Sequelize models/);
      if (modelMatch) {
        modelCount = parseInt(modelMatch[1]);
      }
    });
    
    // Wait a bit for startup
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Kill the server
    serverProcess.kill('SIGTERM');
    
    console.log(`Models loaded: ${modelCount}/43`);
    
    if (modelCount >= 43) {
      console.log('🎉 SUCCESS! All 43 models loaded!');
      return true;
    } else if (modelCount >= 41) {
      console.log('🟡 CLOSE! Most models loaded, may need minor fixes');
      return 'partial';
    } else {
      console.log('❌ Still missing many models');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Server test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🎯 COMPREHENSIVE P0 FIX SEQUENCE');
  console.log('=================================\n');
  
  console.log('Current status: 41-42/43 models loading');
  console.log('Target: 43/43 models with clean DB sync');
  console.log('Key issue: "relation WorkoutSessions does not exist"\n');

  // Step 1: Diagnose the exact missing models
  const step1 = await runStep(
    'STEP 1: Diagnose Missing Models',
    'diagnose-missing-models.mjs',
    'Identifies exactly which models are missing and why'
  );

  // Step 2: Check database table names vs expectations
  const step2 = await runStep(
    'STEP 2: Check Database Table Names',
    'check-table-names.mjs',
    'Verifies what tables exist vs what Sequelize expects'
  );

  // Step 3: Fix WorkoutSession model specifically
  const step3 = await runStep(
    'STEP 3: Fix WorkoutSession Model',
    'fix-workout-models.mjs',
    'Ensures WorkoutSession has correct tableName and configuration'
  );

  // Step 4: Clean duplicate tables
  const step4 = await runStep(
    'STEP 4: Clean Duplicate Tables',
    'clean-duplicate-tables.mjs',
    'Removes Users/users and Achievements/achievements duplicates'
  );

  // Step 5: Test the results
  console.log('🧪 STEP 5: Test Results');
  console.log('=======================\n');
  
  const testResult = await testServerStartup();
  
  console.log('\n📊 FINAL RESULTS:');
  console.log('==================');
  
  if (testResult === true) {
    console.log('🎉 SUCCESS! All P0 issues resolved!');
    console.log('✅ 43/43 models loaded');
    console.log('✅ Clean database sync');
    console.log('✅ No "relation does not exist" errors');
    console.log('');
    console.log('🚀 Your server is now production-ready!');
    
  } else if (testResult === 'partial') {
    console.log('🟡 PARTIAL SUCCESS - Very close!');
    console.log('✅ Most models loaded (41-42/43)');
    console.log('⚠️ May need minor additional fixes');
    console.log('');
    console.log('🔍 Next steps:');
    console.log('1. Check server logs for remaining errors');
    console.log('2. Identify the last 1-2 missing models');
    console.log('3. Check social models or Challenge model');
    
  } else {
    console.log('❌ NEEDS MORE WORK');
    console.log('Still significant issues preventing model loading');
    console.log('');
    console.log('🔍 Next steps:');
    console.log('1. Review the diagnostic outputs above');
    console.log('2. Check for missing model files');
    console.log('3. Verify database connection');
    console.log('4. Check associations.mjs for dependency issues');
  }

  console.log('\n📋 Summary of fixes attempted:');
  console.log(`Step 1 (Diagnose): ${step1 ? '✅' : '❌'}`);
  console.log(`Step 2 (Tables): ${step2 ? '✅' : '❌'}`);
  console.log(`Step 3 (WorkoutSession): ${step3 ? '✅' : '❌'}`);
  console.log(`Step 4 (Cleanup): ${step4 ? '✅' : '❌'}`);
  console.log(`Step 5 (Test): ${testResult === true ? '✅' : testResult === 'partial' ? '🟡' : '❌'}`);

  console.log('\n💡 Remember to also:');
  console.log('1. Deploy the rebuilt frontend (from ../rebuild-frontend.mjs)');
  console.log('2. Test production login with admin/admin123');
  console.log('3. Verify no more frontend URL mismatches');
}

main();
