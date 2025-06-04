/**
 * Quick Diagnostic Script to Test P0 Fixes
 * ========================================
 * Tests model loading and basic database connectivity
 */

import './utils/enhancedRedisErrorSuppressor.mjs';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

import sequelize from './database.mjs';
import getModels from './models/associations.mjs';

async function runDiagnostic() {
  try {
    console.log('🔍 DIAGNOSTIC: Testing P0 Fixes...\n');
    
    // Test 1: Database Connection
    console.log('📋 Test 1: Database Connection');
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connection: SUCCESS');
    } catch (error) {
      console.log('❌ PostgreSQL connection: FAILED');
      console.log('  Error:', error.message);
    }
    
    // Test 2: Model Loading
    console.log('\n📋 Test 2: Model Loading');
    try {
      const models = await getModels();
      const modelCount = Object.keys(models).length;
      console.log(`✅ Models loaded: ${modelCount}`);
      
      if (modelCount >= 35) {
        console.log('🎉 SUCCESS: Model count significantly improved!');
      } else if (modelCount > 21) {
        console.log('📈 PROGRESS: Model count increased from 21');
      } else {
        console.log('❌ ISSUE: Still loading only 21 models');
      }
      
      // List loaded models
      console.log('\n📋 Loaded Models:');
      Object.keys(models).forEach((modelName, index) => {
        console.log(`  ${index + 1}. ${modelName}`);
      });
      
    } catch (error) {
      console.log('❌ Model loading: FAILED');
      console.log('  Error:', error.message);
      console.log('  Stack:', error.stack);
    }
    
    // Test 3: Critical Table Names
    console.log('\n📋 Test 3: Critical Table Checks');
    try {
      const [usersTable] = await sequelize.query("SELECT tablename FROM pg_tables WHERE tablename ILIKE '%users%'");
      console.log('Users tables found:', usersTable.map(t => t.tablename));
      
      const [achievementsTable] = await sequelize.query("SELECT tablename FROM pg_tables WHERE tablename ILIKE '%achievements%'");
      console.log('Achievements tables found:', achievementsTable.map(t => t.tablename));
      
    } catch (error) {
      console.log('❌ Table check failed:', error.message);
    }
    
    // Test 4: Foreign Key Constraint Check
    console.log('\n📋 Test 4: Basic Foreign Key Test');
    try {
      // Try to sync one problematic table to see if FK issues are resolved
      const models = await getModels();
      if (models.UserAchievement) {
        await models.UserAchievement.sync({ force: false });
        console.log('✅ UserAchievement table: No FK errors');
      }
      
      if (models.SocialPost) {
        await models.SocialPost.sync({ force: false });
        console.log('✅ SocialPost table: No FK errors');
      }
      
    } catch (error) {
      console.log('❌ FK test failed:', error.message);
    }
    
    console.log('\n🎯 DIAGNOSTIC COMPLETE');
    console.log('=====================================');
    
  } catch (error) {
    console.error('💥 Diagnostic failed:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

runDiagnostic();
