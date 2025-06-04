#!/usr/bin/env node

/**
 * 🔍 Database Table Names Investigation
 * ====================================
 * 
 * Checks what tables actually exist in PostgreSQL vs what Sequelize models expect
 * Focuses on the WorkoutSessions table missing issue
 */

import sequelize from './database.mjs';

console.log('🔍 Database Table Names Investigation');
console.log('=====================================\n');

async function checkTableNames() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Get all table names from PostgreSQL
    console.log('📋 EXISTING TABLES IN DATABASE:');
    console.log('===============================');
    
    const [tables] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    if (tables.length === 0) {
      console.log('❌ No tables found in database');
      return;
    }

    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.tablename}`);
    });

    console.log(`\nTotal tables: ${tables.length}\n`);

    // Check specific workout-related tables
    console.log('🏋️ WORKOUT-RELATED TABLES CHECK:');
    console.log('=================================');
    
    const workoutTables = [
      'WorkoutSessions', 'workoutsessions', 'workout_sessions',
      'WorkoutPlans', 'workoutplans', 'workout_plans', 
      'Exercises', 'exercises',
      'Users', 'users',
      'Achievements', 'achievements'
    ];

    for (const tableName of workoutTables) {
      const exists = tables.some(t => t.tablename === tableName);
      console.log(`${exists ? '✅' : '❌'} ${tableName}`);
    }

    console.log('');

    // Check for case sensitivity issues
    console.log('🔤 CASE SENSITIVITY ANALYSIS:');
    console.log('=============================');
    
    const caseIssues = [];
    const lowerTables = tables.map(t => t.tablename.toLowerCase());
    
    // Check for duplicate case variations
    const duplicates = new Map();
    lowerTables.forEach(lower => {
      const matching = tables.filter(t => t.tablename.toLowerCase() === lower);
      if (matching.length > 1) {
        duplicates.set(lower, matching.map(t => t.tablename));
      }
    });

    if (duplicates.size > 0) {
      console.log('⚠️ DUPLICATE TABLE NAMES (different cases):');
      duplicates.forEach((variants, baseName) => {
        console.log(`   ${baseName}: ${variants.join(', ')}`);
        caseIssues.push(baseName);
      });
    } else {
      console.log('✅ No case sensitivity duplicates found');
    }

    console.log('');

    // Check what Sequelize expects vs what exists
    console.log('🔍 SEQUELIZE EXPECTATIONS vs REALITY:');
    console.log('=====================================');
    
    const expectedTables = [
      { model: 'WorkoutSession', expected: 'WorkoutSessions', critical: true },
      { model: 'WorkoutPlan', expected: 'WorkoutPlans', critical: true },
      { model: 'Exercise', expected: 'Exercises', critical: true },
      { model: 'User', expected: 'Users', critical: true },
      { model: 'Achievement', expected: 'Achievements', critical: true },
      { model: 'SocialPost', expected: 'SocialPosts', critical: false },
      { model: 'Challenge', expected: 'Challenges', critical: false }
    ];

    const missingTables = [];
    
    expectedTables.forEach(({ model, expected, critical }) => {
      const exists = tables.some(t => t.tablename === expected);
      const priority = critical ? '(CRITICAL)' : '';
      console.log(`${exists ? '✅' : '❌'} ${model} → "${expected}" ${priority}`);
      
      if (!exists) {
        missingTables.push({ model, expected, critical });
      }
    });

    console.log('');

    // Provide specific fixes
    if (missingTables.length > 0) {
      console.log('🔧 REQUIRED FIXES:');
      console.log('==================');
      
      const criticalMissing = missingTables.filter(t => t.critical);
      if (criticalMissing.length > 0) {
        console.log('🚨 Critical missing tables:');
        criticalMissing.forEach(({ model, expected }) => {
          console.log(`   - ${model} model expects "${expected}" table`);
        });
        console.log('');
        
        console.log('💡 Solutions:');
        console.log('1. Check if model files have correct tableName property');
        console.log('2. Run database sync to create missing tables');
        console.log('3. Check if models are being loaded in correct order');
      }
      
      console.log('');
    }

    // Check for duplicates needing cleanup
    if (caseIssues.length > 0) {
      console.log('🧹 CLEANUP NEEDED:');
      console.log('==================');
      console.log('Duplicate table cases found. You should:');
      caseIssues.forEach(baseName => {
        const variants = duplicates.get(baseName);
        console.log(`\n${baseName}:`);
        console.log(`   Keep: ${variants.find(v => v[0] === v[0].toUpperCase()) || variants[0]}`);
        console.log(`   Drop: ${variants.filter(v => v !== (variants.find(v => v[0] === v[0].toUpperCase()) || variants[0])).join(', ')}`);
      });
    }

    return { tables, missingTables, caseIssues };

  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
    return null;
  } finally {
    await sequelize.close();
  }
}

async function main() {
  const result = await checkTableNames();
  
  if (result) {
    const { missingTables, caseIssues } = result;
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('==============');
    
    if (missingTables.some(t => t.critical)) {
      console.log('1. 🚨 Fix critical missing tables first');
      console.log('   Run: node fix-workout-models.mjs');
    }
    
    if (caseIssues.length > 0) {
      console.log('2. 🧹 Clean up duplicate table names');
      console.log('   Run: node clean-duplicate-tables.mjs');
    }
    
    console.log('3. 🧪 Test model loading');
    console.log('   Run: npm run start');
    console.log('   Expected: 43/43 models loaded');
    
    console.log('\n💡 If tables are missing, the models might not be:');
    console.log('   - Properly imported in models/index.mjs');
    console.log('   - Have correct tableName definitions');
    console.log('   - Be in the right order for associations');
  }
}

main();
