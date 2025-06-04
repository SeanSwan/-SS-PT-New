#!/usr/bin/env node

/**
 * 🔍 P0 MODEL DIAGNOSTIC - Missing WorkoutSessions Investigation
 * =============================================================
 * 
 * Investigates why WorkoutSessions table doesn't exist and which models are missing
 * from the 41/43 target. Focuses on workout-related parent models.
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 P0 MODEL DIAGNOSTIC - Missing WorkoutSessions Investigation');
console.log('==============================================================\n');

// Expected 43 models based on the models directory
const expectedModels = [
  'User', 'Session', 'WorkoutPlan', 'WorkoutPlanDay', 'WorkoutPlanDayExercise',
  'WorkoutSession', 'WorkoutExercise', 'Exercise', 'MuscleGroup', 'ExerciseMuscleGroup',
  'Equipment', 'ExerciseEquipment', 'ClientProgress', 'Set', 'StorefrontItem',
  'ShoppingCart', 'CartItem', 'Order', 'OrderItem', 'Gamification',
  'GamificationSettings', 'Achievement', 'UserAchievement', 'Milestone', 'UserMilestone',
  'Reward', 'UserReward', 'PointTransaction', 'Notification', 'NotificationSettings',
  'AdminSettings', 'FoodProduct', 'FoodIngredient', 'FoodScanHistory', 'Orientation',
  // Social models (likely causing issues)
  'SocialPost', 'SocialComment', 'SocialFollow', 'SocialLike',
  // Challenge models (likely causing issues)  
  'Challenge', 'ChallengeParticipant', 'ChallengeTeam'
];

// Models loaded in the last successful run (41 models)
const loadedModels = [
  'User', 'Session', 'WorkoutPlan', 'WorkoutPlanDay', 'WorkoutPlanDayExercise',
  'WorkoutExercise', 'Exercise', 'MuscleGroup', 'ExerciseMuscleGroup',
  'Equipment', 'ExerciseEquipment', 'ClientProgress', 'Set', 'StorefrontItem',
  'ShoppingCart', 'CartItem', 'Order', 'OrderItem', 'Gamification',
  'GamificationSettings', 'Achievement', 'UserAchievement', 'Milestone', 'UserMilestone',
  'Reward', 'UserReward', 'PointTransaction', 'Notification', 'NotificationSettings',
  'AdminSettings', 'FoodProduct', 'FoodIngredient', 'FoodScanHistory', 'Orientation',
  'SocialPost', 'SocialComment', 'SocialFollow', 'SocialLike', 'Friendship'
];

function analyzeModels() {
  console.log('📋 MODEL ANALYSIS');
  console.log('==================\n');

  console.log(`Expected models: ${expectedModels.length}`);
  console.log(`Actually loaded: ${loadedModels.length}`);
  console.log(`Missing: ${expectedModels.length - loadedModels.length}\n`);

  // Find missing models
  const missingModels = expectedModels.filter(model => !loadedModels.includes(model));
  
  console.log('❌ MISSING MODELS:');
  if (missingModels.length > 0) {
    missingModels.forEach(model => {
      console.log(`   - ${model}`);
    });
  } else {
    console.log('   None identified (may be naming discrepancy)');
  }
  
  console.log('');

  // Find extra models (in loaded but not expected)
  const extraModels = loadedModels.filter(model => !expectedModels.includes(model));
  
  console.log('➕ EXTRA MODELS (loaded but not in expected list):');
  if (extraModels.length > 0) {
    extraModels.forEach(model => {
      console.log(`   - ${model}`);
    });
  } else {
    console.log('   None');
  }
  
  console.log('');

  return { missingModels, extraModels };
}

function checkWorkoutModels() {
  console.log('🏋️ WORKOUT-RELATED MODEL ANALYSIS');
  console.log('==================================\n');

  const workoutModels = [
    { name: 'WorkoutSession', loaded: loadedModels.includes('WorkoutSession'), critical: true },
    { name: 'WorkoutPlan', loaded: loadedModels.includes('WorkoutPlan'), critical: true },
    { name: 'Exercise', loaded: loadedModels.includes('Exercise'), critical: true },
    { name: 'WorkoutExercise', loaded: loadedModels.includes('WorkoutExercise'), critical: false },
    { name: 'WorkoutPlanDay', loaded: loadedModels.includes('WorkoutPlanDay'), critical: false },
    { name: 'WorkoutPlanDayExercise', loaded: loadedModels.includes('WorkoutPlanDayExercise'), critical: false }
  ];

  workoutModels.forEach(model => {
    const status = model.loaded ? '✅' : '❌';
    const priority = model.critical ? '(CRITICAL)' : '';
    console.log(`${status} ${model.name} ${priority}`);
  });

  console.log('');

  const missingCritical = workoutModels.filter(m => m.critical && !m.loaded);
  if (missingCritical.length > 0) {
    console.log('🚨 CRITICAL MISSING WORKOUT MODELS:');
    missingCritical.forEach(model => {
      console.log(`   ❌ ${model.name} - This could cause "relation does not exist" errors`);
    });
  } else {
    console.log('✅ All critical workout models are loaded');
  }

  return missingCritical;
}

function checkModelFiles() {
  console.log('\n📁 MODEL FILE ANALYSIS');
  console.log('=======================\n');

  const modelsDir = './models';
  const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.mjs') && !file.includes('index'));

  console.log(`Model files found: ${modelFiles.length}`);
  
  // Check for key workout models
  const keyModels = ['WorkoutSession.mjs', 'WorkoutPlan.mjs', 'Exercise.mjs', 'Challenge.mjs'];
  
  keyModels.forEach(modelFile => {
    const exists = modelFiles.includes(modelFile);
    console.log(`${exists ? '✅' : '❌'} ${modelFile}`);
    
    if (exists) {
      // Read the file and check tableName
      try {
        const filePath = path.join(modelsDir, modelFile);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extract tableName
        const tableNameMatch = content.match(/tableName:\s*['"`]([^'"`]+)['"`]/);
        if (tableNameMatch) {
          console.log(`     tableName: "${tableNameMatch[1]}"`);
        } else {
          console.log(`     tableName: (default - likely "${modelFile.replace('.mjs', 's')}")`);
        }
        
        // Check if it has UUID or INTEGER id
        const uuidMatch = content.match(/id:\s*{[^}]*DataTypes\.UUID/);
        const integerMatch = content.match(/id:\s*{[^}]*DataTypes\.INTEGER/);
        if (uuidMatch) {
          console.log(`     ID type: UUID`);
        } else if (integerMatch) {
          console.log(`     ID type: INTEGER`);
        } else {
          console.log(`     ID type: (check manually)`);
        }
        
      } catch (error) {
        console.log(`     Error reading file: ${error.message}`);
      }
    }
    console.log('');
  });
}

function provideFixes() {
  console.log('🔧 RECOMMENDED FIXES');
  console.log('====================\n');

  console.log('1. **Immediate Fix - Check WorkoutSession Model:**');
  console.log('   - Verify WorkoutSession.mjs exists and has correct tableName');
  console.log('   - Should be: tableName: \'"WorkoutSessions"\' (uppercase, quoted)');
  console.log('   - Check if it\'s actually being imported in models/index.mjs\n');

  console.log('2. **Table Name Investigation:**');
  console.log('   - Run: node check-table-names.mjs');
  console.log('   - This will check what tables actually exist vs what Sequelize expects\n');

  console.log('3. **Association Order Fix:**');
  console.log('   - WorkoutSession must be defined BEFORE SocialPosts, WorkoutExercise, etc.');
  console.log('   - Check models/associations.mjs for dependency order\n');

  console.log('4. **Clean Duplicate Tables:**');
  console.log('   - Drop lowercase "users" table if "Users" exists');
  console.log('   - Drop lowercase "achievements" table if "Achievements" exists\n');

  console.log('5. **Missing Models Investigation:**');
  console.log('   - Check if Challenge.mjs exists (might be missing from social models)');
  console.log('   - Verify all social models are in social/index.mjs\n');
}

function main() {
  const { missingModels } = analyzeModels();
  const missingCritical = checkWorkoutModels();
  checkModelFiles();
  provideFixes();

  console.log('🎯 PRIORITY ACTIONS:');
  console.log('====================');
  
  if (missingCritical.length > 0) {
    console.log('1. Fix missing critical workout models first');
    console.log('2. Run: node fix-workout-models.mjs');
  } else {
    console.log('1. Check tableName definitions in WorkoutSession.mjs');
    console.log('2. Run: node check-table-names.mjs');
  }
  
  console.log('3. Run: node clean-duplicate-tables.mjs');
  console.log('4. Test: npm run start (should hit 43/43 models)');
  
  console.log('\n💡 Expected Result: Clean server startup with 43/43 models loaded');
}

main();
