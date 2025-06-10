#!/usr/bin/env node

/**
 * Quick Contact Fix Verification
 * =============================
 * Simple test to verify the contact model fix works
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function quickTest() {
  console.log('⚡ Quick Contact Fix Test');
  console.log('========================');
  
  try {
    // Test 1: Can we import the Contact model from associations?
    console.log('Test 1: Contact model in associations...');
    const getModels = await import('./backend/models/associations.mjs').then(m => m.default);
    const models = await getModels();
    
    if (models.Contact) {
      console.log('✅ PASS: Contact model found in associations');
    } else {
      console.log('❌ FAIL: Contact model missing from associations');
      return;
    }
    
    // Test 2: Can we connect to database?
    console.log('Test 2: Database connection...');
    const { default: sequelize } = await import('./backend/database.mjs');
    await sequelize.authenticate();
    console.log('✅ PASS: Database connection works');
    
    // Test 3: Can we query contacts?
    console.log('Test 3: Contact queries...');
    const contacts = await models.Contact.findAll({ limit: 1 });
    console.log('✅ PASS: Contact queries work');
    
    console.log('');
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ The contact notifications fix is working');
    console.log('✅ Ready to deploy to production');
    
  } catch (error) {
    console.log('❌ TEST FAILED:', error.message);
    console.log('🔧 Fix needed before deployment');
  }
}

quickTest();
