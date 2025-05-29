/**
 * Test Migration Fix for Sessions Table
 * ===================================
 * 
 * This script tests the database migration that adds missing columns
 * to the sessions table to resolve the "column Session.reason does not exist" error.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sequelize from './backend/database.mjs';
import Session from './backend/models/Session.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testSessionTableFix() {
  console.log('🧪 Testing Session Table Migration Fix...\n');

  try {
    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Test 2: Session Model Structure
    console.log('2. Testing Session model structure...');
    const sessionAttributes = Session.getTableName ? await Session.describe() : Session.rawAttributes;
    
    const requiredColumns = ['reason', 'isRecurring', 'recurringPattern', 'deletedAt'];
    const missingColumns = [];
    
    for (const column of requiredColumns) {
      if (!sessionAttributes[column]) {
        missingColumns.push(column);
      }
    }
    
    if (missingColumns.length > 0) {
      console.log(`⚠️ Missing columns detected: ${missingColumns.join(', ')}`);
      console.log('❌ Migration needs to be run\n');
    } else {
      console.log('✅ All required columns are present\n');
    }

    // Test 3: Query Sessions (the failing query from the error)
    console.log('3. Testing session query (the one that was failing)...');
    try {
      const sessions = await Session.findAll({
        limit: 1,
        include: [] // This should work without User association for now
      });
      console.log(`✅ Session query successful. Found ${sessions.length} session(s)\n`);
    } catch (queryError) {
      console.log('❌ Session query failed:', queryError.message);
      if (queryError.message.includes('column') && queryError.message.includes('does not exist')) {
        console.log('🔧 This indicates the migration still needs to be run\n');
      }
    }

    // Test 4: Test Session Creation (to verify all columns work)
    console.log('4. Testing session creation with new columns...');
    try {
      const testSession = await Session.build({
        sessionDate: new Date(),
        duration: 60,
        status: 'available',
        reason: 'Test blocked time',
        isRecurring: false,
        recurringPattern: null
      });
      
      // Validate without saving
      await testSession.validate();
      console.log('✅ Session creation with new columns successful\n');
    } catch (createError) {
      console.log('❌ Session creation failed:', createError.message, '\n');
    }

    // Summary
    console.log('📋 MIGRATION FIX SUMMARY:');
    console.log('========================');
    if (missingColumns.length === 0) {
      console.log('✅ Migration has been applied successfully');
      console.log('✅ All required Session columns are present');
      console.log('✅ Session queries should work correctly');
      console.log('\n🎉 The "column Session.reason does not exist" error should be resolved!');
    } else {
      console.log('⚠️ Migration still needs to be applied');
      console.log('📝 Run the following command to apply the migration:');
      console.log('   npx sequelize-cli db:migrate');
      console.log('\n🔧 After running the migration, the errors should be resolved.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Possible solutions:');
    console.log('   1. Ensure database is running');
    console.log('   2. Check database connection settings');
    console.log('   3. Run the migration: npx sequelize-cli db:migrate');
  } finally {
    await sequelize.close();
  }
}

// Run the test
testSessionTableFix();