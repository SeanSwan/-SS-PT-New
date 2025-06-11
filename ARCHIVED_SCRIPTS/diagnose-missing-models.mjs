// DIAGNOSE MISSING ACHIEVEMENTS TABLE & MODEL LOADING ISSUES
// Identifies why only 21/43 models load and why Achievements table is missing

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const diagnoseModelLoadingIssues = async () => {
  try {
    console.log('🔍 DIAGNOSING MODEL LOADING & ACHIEVEMENTS ISSUES');
    console.log('=================================================');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Check current tables in database
    console.log('\n📋 STEP 1: Current database tables');
    console.log('===================================');
    
    const tables = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `, { type: QueryTypes.SELECT });
    
    console.log(`Found ${tables.length} tables:`);
    tables.forEach(table => console.log(`  - ${table.table_name}`));
    
    // Check if Achievements table exists
    const hasAchievements = tables.some(t => t.table_name === 'Achievements' || t.table_name === 'achievements');
    console.log(`\n🏆 Achievements table exists: ${hasAchievements ? '✅ YES' : '❌ NO'}`);
    
    // Check model file existence
    console.log('\n📂 STEP 2: Checking model file existence');
    console.log('=========================================');
    
    const expectedModels = [
      'User.mjs', 'Session.mjs', 'ClientProgress.mjs', 'Gamification.mjs',
      'Achievement.mjs', 'GamificationSettings.mjs', 'UserAchievement.mjs',
      'UserReward.mjs', 'UserMilestone.mjs', 'Reward.mjs', 'Milestone.mjs',
      'PointTransaction.mjs', 'StorefrontItem.mjs', 'ShoppingCart.mjs',
      'CartItem.mjs', 'Order.mjs', 'OrderItem.mjs', 'Notification.mjs',
      'Orientation.mjs', 'FoodIngredient.mjs', 'FoodProduct.mjs', 'FoodScanHistory.mjs'
    ];
    
    let missingModels = [];
    let existingModels = [];
    
    for (const modelFile of expectedModels) {
      try {
        const model = await import(`./backend/models/${modelFile}`);
        if (model.default) {
          existingModels.push(modelFile);
          console.log(`✅ ${modelFile}: ${model.default.name || 'Model'}`);
        } else {
          console.log(`⚠️ ${modelFile}: No default export`);
          missingModels.push(modelFile);
        }
      } catch (error) {
        console.log(`❌ ${modelFile}: ${error.message}`);
        missingModels.push(modelFile);
      }
    }
    
    console.log(`\n📊 Model file summary:`);
    console.log(`  ✅ Existing: ${existingModels.length}`);
    console.log(`  ❌ Missing/Broken: ${missingModels.length}`);
    
    if (missingModels.length > 0) {
      console.log(`\n❌ Missing/broken models:`);
      missingModels.forEach(model => console.log(`  - ${model}`));
    }
    
    // Test Achievement model specifically
    console.log('\n🏆 STEP 3: Testing Achievement model specifically');
    console.log('================================================');
    
    try {
      const Achievement = await import('./backend/models/Achievement.mjs');
      console.log('✅ Achievement.mjs imports successfully');
      console.log('Achievement model:', typeof Achievement.default);
      
      if (Achievement.default) {
        const tableName = Achievement.default.tableName || Achievement.default.getTableName?.() || 'unknown';
        console.log(`Table name: ${tableName}`);
        
        // Try to describe the model
        try {
          const attributes = Object.keys(Achievement.default.rawAttributes || {});
          console.log(`Attributes: ${attributes.join(', ')}`);
        } catch (attrError) {
          console.log('Could not get attributes:', attrError.message);
        }
      }
    } catch (achievementError) {
      console.log('❌ Achievement model error:', achievementError.message);
      console.log('This explains why Achievements table is missing!');
    }
    
    // Test associations loading
    console.log('\n🔗 STEP 4: Testing associations loading');
    console.log('======================================');
    
    try {
      const setupAssociations = await import('./backend/setupAssociations.mjs');
      console.log('✅ setupAssociations.mjs imports successfully');
      
      const models = await setupAssociations.default();
      const modelCount = Object.keys(models || {}).length;
      console.log(`Models returned by setupAssociations: ${modelCount}`);
      
      if (models) {
        const modelNames = Object.keys(models);
        console.log('Loaded models:', modelNames.join(', '));
        
        // Check if Achievement is in the loaded models
        if (modelNames.includes('Achievement')) {
          console.log('✅ Achievement model is in loaded models');
        } else {
          console.log('❌ Achievement model NOT in loaded models');
          console.log('This explains the UserAchievements table creation failure!');
        }
      }
    } catch (assocError) {
      console.log('❌ Associations loading error:', assocError.message);
    }
    
    // Check for circular dependencies or import order issues
    console.log('\n🔄 STEP 5: Checking for import order issues');
    console.log('===========================================');
    
    try {
      // Try importing associations.mjs directly
      const associations = await import('./backend/models/associations.mjs');
      console.log('✅ associations.mjs imports successfully');
      
      const directModels = await associations.default();
      const directModelCount = Object.keys(directModels || {}).length;
      console.log(`Models from direct associations.mjs call: ${directModelCount}`);
      
      if (directModels) {
        const hasAchievementDirect = Object.keys(directModels).includes('Achievement');
        console.log(`Achievement in direct call: ${hasAchievementDirect ? '✅ YES' : '❌ NO'}`);
      }
    } catch (directError) {
      console.log('❌ Direct associations import error:', directError.message);
    }
    
    // Summary and recommendations
    console.log('\n🎯 DIAGNOSIS SUMMARY');
    console.log('====================');
    
    const issues = [];
    
    if (!hasAchievements) {
      issues.push('❌ Achievements table missing from database');
    }
    
    if (missingModels.includes('Achievement.mjs')) {
      issues.push('❌ Achievement.mjs model file missing or broken');
    }
    
    if (issues.length === 0) {
      console.log('✅ No obvious issues found - need deeper investigation');
    } else {
      console.log('🚨 Issues found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }
    
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. If Achievement.mjs is missing/broken → Fix the model file');
    console.log('2. If Achievement.mjs exists but not in associations → Check associations.mjs imports');
    console.log('3. If import order issue → Reorder imports in associations.mjs');
    console.log('4. If table creation order issue → Fix dependency order');
    
    return {
      success: true,
      tablesFound: tables.length,
      modelsExisting: existingModels.length,
      modelsMissing: missingModels.length,
      achievementsTableExists: hasAchievements,
      issues: issues
    };
    
  } catch (error) {
    console.error('💥 Diagnosis error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
  }
};

diagnoseModelLoadingIssues().then(result => {
  console.log('\n🎯 DIAGNOSIS RESULT:');
  console.log('====================');
  console.log(JSON.stringify(result, null, 2));
});
