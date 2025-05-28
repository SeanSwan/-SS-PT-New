#!/usr/bin/env node
/**
 * Association Fix Verification Script
 * ==================================
 * Tests that the User-Session associations are properly configured
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function verifyAssociationsFix() {
  console.log('🔍 VERIFYING SESSION-USER ASSOCIATIONS FIX');
  console.log('==========================================\n');

  try {
    // Import models
    console.log('📦 Importing models...');
    const getModels = (await import('./backend/models/associations.mjs')).default;
    const models = await getModels();
    
    const { User, Session } = models;
    
    console.log('✅ Models imported successfully');
    console.log(`📊 Available models: ${Object.keys(models).join(', ')}\n`);

    // Test User associations
    console.log('🔗 Testing User associations...');
    const userAssociations = User.associations;
    console.log('👤 User associations:', Object.keys(userAssociations));
    
    // Check for Session-related associations
    const hasClientSessions = 'clientSessions' in userAssociations;
    const hasTrainerSessions = 'trainerSessions' in userAssociations;
    
    console.log(`   ✅ User.clientSessions: ${hasClientSessions ? 'FOUND' : 'MISSING'}`);
    console.log(`   ✅ User.trainerSessions: ${hasTrainerSessions ? 'FOUND' : 'MISSING'}`);

    // Test Session associations  
    console.log('\n🔗 Testing Session associations...');
    const sessionAssociations = Session.associations;
    console.log('📅 Session associations:', Object.keys(sessionAssociations));
    
    // Check for User-related associations
    const hasClient = 'client' in sessionAssociations;
    const hasTrainer = 'trainer' in sessionAssociations;
    
    console.log(`   ✅ Session.client: ${hasClient ? 'FOUND' : 'MISSING'}`);
    console.log(`   ✅ Session.trainer: ${hasTrainer ? 'FOUND' : 'MISSING'}`);

    // Overall verification
    const allAssociationsPresent = hasClientSessions && hasTrainerSessions && hasClient && hasTrainer;
    
    console.log('\n📊 VERIFICATION RESULTS');
    console.log('=====================');
    
    if (allAssociationsPresent) {
      console.log('🎉 SUCCESS: All required Session-User associations are properly configured!');
      console.log('✅ The "User is not associated to Session!" error should be resolved');
      console.log('✅ enhancedSessionController should now work correctly');
    } else {
      console.log('❌ FAILURE: Some associations are missing');
      console.log('⚠️  The Session-User association error may persist');
    }

    console.log('\n🚀 Next Steps:');
    console.log('==============');
    console.log('1. Restart your backend server');
    console.log('2. Test the /api/schedule endpoint');
    console.log('3. Check that session queries work without association errors');

    return { success: allAssociationsPresent, models };

  } catch (error) {
    console.error('❌ VERIFICATION FAILED:', error.message);
    console.error('📚 Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyAssociationsFix()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Associations verification completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Associations verification failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Verification script crashed:', error);
      process.exit(1);
    });
}

export default verifyAssociationsFix;
