#!/usr/bin/env node

/**
 * 🔧 WorkoutSession Model Fix
 * ==========================
 * 
 * Ensures WorkoutSession model has correct tableName and is properly configured
 * This fixes the "relation WorkoutSessions does not exist" error
 */

import fs from 'fs';
import path from 'path';

console.log('🔧 WorkoutSession Model Fix');
console.log('===========================\n');

function checkWorkoutSessionModel() {
  console.log('📋 Step 1: Check WorkoutSession.mjs file');
  console.log('=========================================\n');

  const modelPath = './models/WorkoutSession.mjs';
  
  if (!fs.existsSync(modelPath)) {
    console.log('❌ WorkoutSession.mjs not found!');
    console.log('💡 This explains why WorkoutSessions table doesn\'t exist');
    return false;
  }

  console.log('✅ WorkoutSession.mjs exists');
  
  try {
    const content = fs.readFileSync(modelPath, 'utf8');
    
    // Check tableName
    const tableNameMatch = content.match(/tableName:\s*['"`]([^'"`]+)['"`]/);
    if (tableNameMatch) {
      const tableName = tableNameMatch[1];
      console.log(`📋 Current tableName: "${tableName}"`);
      
      if (tableName === 'WorkoutSessions') {
        console.log('✅ tableName is correct');
      } else {
        console.log('❌ tableName should be "WorkoutSessions"');
        return { needsTableNameFix: true, currentTableName: tableName };
      }
    } else {
      console.log('❌ No tableName specified (will default to "WorkoutSessions")');
      console.log('💡 Should explicitly set tableName: "WorkoutSessions"');
      return { needsTableNameFix: true, currentTableName: null };
    }

    // Check ID type
    if (content.includes('DataTypes.UUID')) {
      console.log('✅ Using UUID for ID');
    } else if (content.includes('DataTypes.INTEGER')) {
      console.log('⚠️ Using INTEGER for ID (might cause FK issues)');
    }

    // Check if it's a Sequelize model
    if (content.includes('sequelize.define') || content.includes('DataTypes')) {
      console.log('✅ Proper Sequelize model structure');
    } else {
      console.log('❌ Not a proper Sequelize model');
      return { needsModelFix: true };
    }

    console.log('');
    return { isValid: true };

  } catch (error) {
    console.log(`❌ Error reading WorkoutSession.mjs: ${error.message}`);
    return false;
  }
}

function checkModelIndex() {
  console.log('📋 Step 2: Check models/index.mjs imports');
  console.log('==========================================\n');

  const indexPath = './models/index.mjs';
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ models/index.mjs not found!');
    return false;
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Check if WorkoutSession is imported
    if (content.includes('WorkoutSession') && content.includes('./WorkoutSession.mjs')) {
      console.log('✅ WorkoutSession is imported in index.mjs');
    } else {
      console.log('❌ WorkoutSession is NOT imported in index.mjs');
      return { needsImportFix: true };
    }

    // Check if it's exported
    if (content.includes('WorkoutSession,') || content.includes('WorkoutSession\n')) {
      console.log('✅ WorkoutSession is exported');
    } else {
      console.log('❌ WorkoutSession is NOT exported');
      return { needsExportFix: true };
    }

    console.log('');
    return { isValid: true };

  } catch (error) {
    console.log(`❌ Error reading models/index.mjs: ${error.message}`);
    return false;
  }
}

function checkAssociations() {
  console.log('📋 Step 3: Check associations.mjs');
  console.log('=================================\n');

  const assocPath = './models/associations.mjs';
  
  if (!fs.existsSync(assocPath)) {
    console.log('⚠️ associations.mjs not found (might be ok)');
    return { isValid: true };
  }

  try {
    const content = fs.readFileSync(assocPath, 'utf8');
    
    if (content.includes('WorkoutSession')) {
      console.log('✅ WorkoutSession referenced in associations');
      
      // Check for problematic associations
      if (content.includes('SocialPost') && content.includes('WorkoutSession')) {
        const socialIndex = content.indexOf('SocialPost');
        const workoutIndex = content.indexOf('WorkoutSession');
        
        if (socialIndex < workoutIndex) {
          console.log('⚠️ SocialPost defined before WorkoutSession - might cause issues');
          return { needsOrderFix: true };
        } else {
          console.log('✅ WorkoutSession defined before SocialPost');
        }
      }
    } else {
      console.log('⚠️ WorkoutSession not referenced in associations');
    }

    console.log('');
    return { isValid: true };

  } catch (error) {
    console.log(`❌ Error reading associations.mjs: ${error.message}`);
    return false;
  }
}

function fixWorkoutSessionModel() {
  console.log('🔧 Step 4: Apply Fixes');
  console.log('======================\n');

  const modelPath = './models/WorkoutSession.mjs';
  
  if (!fs.existsSync(modelPath)) {
    console.log('❌ Cannot fix: WorkoutSession.mjs not found');
    console.log('💡 You may need to restore this file from backup or recreate it');
    return false;
  }

  try {
    let content = fs.readFileSync(modelPath, 'utf8');
    let modified = false;

    // Fix tableName if needed
    if (!content.includes('tableName:') || !content.includes('"WorkoutSessions"')) {
      console.log('🔧 Adding/fixing tableName...');
      
      // Find the model definition
      const defineMatch = content.match(/(sequelize\.define\s*\(\s*['"`][^'"`]+['"`]\s*,\s*{[^}]+})\s*,\s*({)/);
      if (defineMatch) {
        // Add tableName to options object
        const replacement = defineMatch[1] + ', {\n  tableName: "WorkoutSessions",';
        content = content.replace(defineMatch[0], replacement);
        modified = true;
        console.log('✅ tableName added');
      } else {
        console.log('⚠️ Could not automatically add tableName - manual fix needed');
      }
    }

    // Ensure UUID ID type
    if (!content.includes('DataTypes.UUID') && content.includes('id:')) {
      console.log('🔧 Converting ID to UUID...');
      content = content.replace(
        /id:\s*{[^}]*DataTypes\.INTEGER[^}]*}/,
        `id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  }`
      );
      modified = true;
      console.log('✅ ID converted to UUID');
    }

    if (modified) {
      // Backup original
      fs.writeFileSync(modelPath + '.backup', fs.readFileSync(modelPath));
      console.log('📄 Original backed up to WorkoutSession.mjs.backup');
      
      // Write fixed version
      fs.writeFileSync(modelPath, content);
      console.log('✅ WorkoutSession.mjs updated');
    } else {
      console.log('✅ No changes needed to WorkoutSession.mjs');
    }

    return true;

  } catch (error) {
    console.log(`❌ Error fixing WorkoutSession.mjs: ${error.message}`);
    return false;
  }
}

function cleanDuplicateTables() {
  console.log('🧹 Step 5: Provide Cleanup Commands');
  console.log('====================================\n');

  console.log('Run these PostgreSQL commands to clean duplicate tables:');
  console.log('');
  console.log('-- Connect to your database first');
  console.log('-- Then run these commands:');
  console.log('');
  console.log('-- Drop lowercase duplicate tables if uppercase versions exist');
  console.log('DROP TABLE IF EXISTS users CASCADE;');
  console.log('DROP TABLE IF EXISTS achievements CASCADE;');
  console.log('DROP TABLE IF EXISTS workoutsessions CASCADE;');
  console.log('DROP TABLE IF EXISTS workoutplans CASCADE;');
  console.log('DROP TABLE IF EXISTS exercises CASCADE;');
  console.log('');
  console.log('💡 Or run: node clean-duplicate-tables.mjs (if created)');
}

function main() {
  console.log('🎯 Investigating WorkoutSession model issues...\n');

  const step1 = checkWorkoutSessionModel();
  const step2 = checkModelIndex();
  const step3 = checkAssociations();

  if (step1 === false) {
    console.log('🚨 CRITICAL: WorkoutSession.mjs file is missing!');
    console.log('This explains why "relation WorkoutSessions does not exist"');
    console.log('');
    console.log('💡 IMMEDIATE ACTIONS:');
    console.log('1. Check if file was accidentally deleted');
    console.log('2. Restore from backup if available');
    console.log('3. Check git history: git log --oneline --follow models/WorkoutSession.mjs');
    return;
  }

  const needsFix = step1.needsTableNameFix || step1.needsModelFix || 
                   step2.needsImportFix || step2.needsExportFix ||
                   step3.needsOrderFix;

  if (needsFix) {
    console.log('🔧 Fixes needed, applying...\n');
    fixWorkoutSessionModel();
  }

  cleanDuplicateTables();

  console.log('\n🎯 NEXT STEPS:');
  console.log('==============');
  console.log('1. Run: node check-table-names.mjs');
  console.log('2. Run: npm run start');
  console.log('3. Check for 43/43 models loaded');
  console.log('4. Verify no "relation does not exist" errors');
  
  console.log('\n✅ Expected result: Clean server startup with all models');
}

main();
