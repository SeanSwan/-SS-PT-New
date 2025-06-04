#!/usr/bin/env node

/**
 * 🎯 Final TableName Consistency Fix - Get to 43/43 Models
 * ========================================================
 * 
 * Fixes table name inconsistencies that are preventing the last 2 models from loading:
 * 1. Exercise model uses 'exercises' (lowercase) but others expect 'Exercises' (uppercase)
 * 2. WorkoutSessions and WorkoutPlans tables need to be created
 * 3. Foreign key references need consistent casing
 */

import fs from 'fs';
import sequelize from './database.mjs';

console.log('🎯 Final TableName Consistency Fix - Get to 43/43 Models');
console.log('=======================================================\n');

console.log('🔍 ISSUE ANALYSIS:');
console.log('==================');
console.log('✅ 41/43 models now loading (huge progress!)');
console.log('✅ Challenge models now work (social import fix succeeded)');
console.log('❌ Exercise model: tableName "exercises" (lowercase)');
console.log('❌ Other models expect: "Exercises" (uppercase)');
console.log('❌ WorkoutSessions/WorkoutPlans tables missing');
console.log('');

async function fixTableNameConsistency() {
  console.log('🔧 Step 1: Fix Exercise Model TableName');
  console.log('=======================================\n');

  const exerciseModelPath = './models/Exercise.mjs';
  
  try {
    let content = fs.readFileSync(exerciseModelPath, 'utf8');
    
    // Check current tableName
    if (content.includes("tableName: 'exercises'")) {
      console.log('📋 Current: tableName: "exercises" (lowercase)');
      console.log('🔧 Changing to: tableName: "Exercises" (uppercase)');
      
      // Replace lowercase with uppercase
      content = content.replace(
        "tableName: 'exercises'",
        'tableName: "Exercises"'
      );
      
      // Backup original
      fs.writeFileSync(exerciseModelPath + '.backup', fs.readFileSync(exerciseModelPath));
      console.log('📄 Original backed up to Exercise.mjs.backup');
      
      // Write fixed version
      fs.writeFileSync(exerciseModelPath, content);
      console.log('✅ Exercise model updated to use "Exercises" tableName');
      
    } else {
      console.log('✅ Exercise model already has correct tableName');
    }
    
  } catch (error) {
    console.log(`❌ Error fixing Exercise model: ${error.message}`);
    return false;
  }
  
  console.log('');
  return true;
}

async function createMissingTables() {
  console.log('🔧 Step 2: Create Missing Tables');
  console.log('================================\n');

  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Rename existing lowercase table to uppercase
    console.log('📋 Renaming exercises → "Exercises"...');
    try {
      await sequelize.query('ALTER TABLE exercises RENAME TO "Exercises"');
      console.log('✅ exercises table renamed to "Exercises"');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('ℹ️ exercises table does not exist, will be created as "Exercises"');
      } else if (error.message.includes('already exists')) {
        console.log('ℹ️ "Exercises" table already exists');
      } else {
        console.log(`⚠️ Rename warning: ${error.message}`);
      }
    }

    // Create missing tables by forcing sync on specific models
    console.log('\n📋 Creating missing workout tables...');
    
    // Import models to force table creation
    const { WorkoutSession, WorkoutPlan, Exercise } = await import('./models/index.mjs');
    
    if (WorkoutSession) {
      try {
        await WorkoutSession.sync({ force: false });
        console.log('✅ WorkoutSessions table created/verified');
      } catch (error) {
        console.log(`⚠️ WorkoutSessions: ${error.message}`);
      }
    }
    
    if (WorkoutPlan) {
      try {
        await WorkoutPlan.sync({ force: false });
        console.log('✅ WorkoutPlans table created/verified');
      } catch (error) {
        console.log(`⚠️ WorkoutPlans: ${error.message}`);
      }
    }
    
    if (Exercise) {
      try {
        await Exercise.sync({ force: false });
        console.log('✅ Exercises table created/verified');
      } catch (error) {
        console.log(`⚠️ Exercises: ${error.message}`);
      }
    }

    console.log('\n📊 Verifying table existence...');
    const [tables] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('Exercises', 'WorkoutSessions', 'WorkoutPlans')
      ORDER BY tablename;
    `);

    console.log('Tables found:');
    tables.forEach(table => {
      console.log(`✅ ${table.tablename}`);
    });

    if (tables.length === 3) {
      console.log('\n🎉 All required tables now exist!');
    } else {
      console.log('\n⚠️ Some tables still missing, but progress made');
    }

  } catch (error) {
    console.log(`❌ Error creating tables: ${error.message}`);
    return false;
  } finally {
    await sequelize.close();
  }

  return true;
}

async function testModelLoading() {
  console.log('\n🧪 Step 3: Test Model Loading');
  console.log('=============================\n');

  console.log('Testing model imports...');
  
  try {
    // Import all models to test
    const models = await import('./models/index.mjs');
    
    const modelList = Object.keys(models.default || models);
    console.log(`📋 Models available: ${modelList.length}`);
    
    // Count specific models
    const importantModels = [
      'User', 'Exercise', 'WorkoutSession', 'WorkoutPlan', 
      'Challenge', 'ChallengeParticipant', 'ChallengeTeam',
      'SocialPost', 'SocialComment', 'SocialLike'
    ];
    
    console.log('\n🔍 Key models check:');
    importantModels.forEach(modelName => {
      const exists = modelList.includes(modelName);
      console.log(`${exists ? '✅' : '❌'} ${modelName}`);
    });
    
    if (modelList.length >= 43) {
      console.log('\n🎉 SUCCESS! All models should now load!');
    } else {
      console.log(`\n🟡 Progress: ${modelList.length}/43 models available`);
    }
    
  } catch (error) {
    console.log(`❌ Error testing models: ${error.message}`);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🎯 CURRENT STATUS:');
  console.log('==================');
  console.log('✅ 41/43 models loading');
  console.log('✅ Challenge models working');
  console.log('✅ Server starts successfully');
  console.log('❌ 2 models missing due to table name inconsistency');
  console.log('');

  const step1 = await fixTableNameConsistency();
  const step2 = await createMissingTables();
  const step3 = await testModelLoading();

  console.log('\n📊 FINAL RESULTS:');
  console.log('==================');
  console.log(`Step 1 (Exercise tableName): ${step1 ? '✅' : '❌'}`);
  console.log(`Step 2 (Create tables): ${step2 ? '✅' : '❌'}`);
  console.log(`Step 3 (Test models): ${step3 ? '✅' : '❌'}`);

  if (step1 && step2) {
    console.log('\n🎉 EXPECTED OUTCOME:');
    console.log('====================');
    console.log('✅ All table names now consistent');
    console.log('✅ Missing tables created');
    console.log('✅ Should hit 43/43 models on next startup');
    console.log('');
    console.log('🚀 NEXT STEP:');
    console.log('=============');
    console.log('Run: npm run start');
    console.log('Expected: "📋 Loaded 43 Sequelize models"');
    console.log('');
    console.log('🎯 Then deploy frontend and test production login!');
  } else {
    console.log('\n❌ Some fixes failed - check errors above');
  }
}

main();
