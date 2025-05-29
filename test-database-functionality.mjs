/**
 * DATABASE FUNCTIONALITY TEST
 * ============================
 * 
 * This script tests if the database is currently working correctly
 * by trying the operations that were failing before.
 */

import sequelize from './backend/database.mjs';
import Session from './backend/models/Session.mjs';
import User from './backend/models/User.mjs';
import getModels from './backend/models/associations.mjs';

async function testDatabaseFunctionality() {
  console.log('🧪 DATABASE FUNCTIONALITY TEST');
  console.log('===============================\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Load associations
    console.log('Loading model associations...');
    await getModels();
    console.log('✅ Model associations loaded\n');

    // Test 1: Basic user query
    console.log('TEST 1: Basic user query');
    console.log('------------------------');
    try {
      const users = await User.findAll({ limit: 5 });
      console.log(`✅ User.findAll() successful - found ${users.length} users`);
      
      if (users.length > 0) {
        const firstUser = users[0];
        console.log(`   Sample user: ID=${firstUser.id} (${typeof firstUser.id}), Email=${firstUser.email}`);
      }
    } catch (error) {
      console.log(`❌ User.findAll() failed: ${error.message}`);
    }

    // Test 2: Session query (the one that was failing)
    console.log('\nTEST 2: Session query (previously failing)');
    console.log('------------------------------------------');
    try {
      const sessions = await Session.findAll({ 
        limit: 5,
        // Don't include User association yet - test basic query first
      });
      console.log(`✅ Session.findAll() successful - found ${sessions.length} sessions`);
      
      if (sessions.length > 0) {
        const firstSession = sessions[0];
        console.log(`   Sample session: ID=${firstSession.id}, Status=${firstSession.status}`);
        console.log(`   UserId=${firstSession.userId}, TrainerId=${firstSession.trainerId}`);
      }
    } catch (error) {
      console.log(`❌ Session.findAll() failed: ${error.message}`);
      
      // If this fails, check if it's the "column does not exist" error
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('   🔍 This appears to be the missing column error we need to fix');
      }
    }

    // Test 3: Session with User association (the complex failing query)
    console.log('\nTEST 3: Session with User association');
    console.log('-------------------------------------');
    try {
      // First check if User-Session associations are properly set up
      const sessionWithUser = await Session.findOne({
        include: [
          {
            model: User,
            as: 'client', // Use the correct alias from associations.mjs
            required: false
          }
        ]
      });
      console.log('✅ Session.findOne() with User association successful');
    } catch (error) {
      console.log(`❌ Session with User association failed: ${error.message}`);
      
      if (error.message.includes('is not associated')) {
        console.log('   🔍 This is likely the association error - models not properly linked');
      }
    }

    // Test 4: Check specific session columns
    console.log('\nTEST 4: Check session columns');
    console.log('-----------------------------');
    try {
      const sessionColumns = await sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'sessions'
        ORDER BY ordinal_position
      `);
      
      const columns = sessionColumns[0].map(col => col.column_name);
      console.log(`Session table has ${columns.length} columns:`, columns.join(', '));
      
      const requiredColumns = ['reason', 'isRecurring', 'recurringPattern', 'deletedAt'];
      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log(`❌ Missing required columns: ${missingColumns.join(', ')}`);
      } else {
        console.log('✅ All required session columns present');
      }
      
    } catch (error) {
      console.log(`❌ Column check failed: ${error.message}`);
    }

    // Test 5: Foreign key compatibility test
    console.log('\nTEST 5: Foreign key compatibility');
    console.log('---------------------------------');
    try {
      const userIdType = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      
      const sessionUserIdType = await sequelize.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'sessions' AND column_name = 'userId'
      `);
      
      const userType = userIdType[0][0]?.data_type;
      const sessionType = sessionUserIdType[0][0]?.data_type;
      
      console.log(`users.id type: ${userType}`);
      console.log(`sessions.userId type: ${sessionType}`);
      
      if (userType === sessionType) {
        console.log('✅ Foreign key types are compatible');
      } else {
        console.log('❌ Foreign key types are incompatible - THIS IS THE MAIN ISSUE');
        console.log('   This is why foreign key constraints fail');
      }
      
    } catch (error) {
      console.log(`❌ Foreign key compatibility check failed: ${error.message}`);
    }

    // Summary
    console.log('\n📋 TEST SUMMARY');
    console.log('================');
    
    // Check the critical issue
    const userIdCheck = await sequelize.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `).then(r => r[0][0]?.data_type).catch(() => 'unknown');
    
    if (userIdCheck === 'uuid') {
      console.log('🚨 CRITICAL ISSUE CONFIRMED: users.id is UUID type');
      console.log('   ❌ This causes foreign key constraint failures');
      console.log('   ❌ Platform cannot work correctly in this state');
      console.log('   🔧 SOLUTION: Run RUN-ROBUST-UUID-FIX.bat');
    } else if (userIdCheck === 'integer') {
      console.log('✅ GOOD: users.id is INTEGER type (correct)');
      console.log('   Check if any other issues need fixing');
    } else {
      console.log(`⚠️ UNUSUAL: users.id is ${userIdCheck} type`);
    }

    // Check session columns
    const sessionColumnsCheck = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sessions'
    `).then(r => r[0].map(col => col.column_name)).catch(() => []);
    
    const missingCols = ['reason', 'isRecurring', 'recurringPattern', 'deletedAt']
      .filter(col => !sessionColumnsCheck.includes(col));
    
    if (missingCols.length > 0) {
      console.log(`❌ Missing session columns: ${missingCols.join(', ')}`);
      console.log('   This causes "column does not exist" errors');
    } else {
      console.log('✅ All session columns present');
    }

    console.log('\n🎯 RECOMMENDED ACTIONS:');
    console.log('========================');
    
    if (userIdCheck === 'uuid') {
      console.log('1. 🚨 URGENT: Run RUN-ROBUST-UUID-FIX.bat to fix UUID issue');
      console.log('2. This will also add missing session columns');
      console.log('3. Test platform after fix');
      console.log('4. Deploy to production');
    } else if (missingCols.length > 0) {
      console.log('1. Add missing session columns');
      console.log('2. Test platform functionality');
      console.log('3. Deploy to production');
    } else {
      console.log('1. ✅ Database appears to be in good state');
      console.log('2. Test platform functionality');
      console.log('3. Check for other issues if platform still has errors');
    }

  } catch (error) {
    console.error('❌ Database functionality test failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

testDatabaseFunctionality();