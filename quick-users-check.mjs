// Quick Users Table Verification
// Checks if the "relation Users does not exist" issue is resolved

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const quickUsersCheck = async () => {
  try {
    console.log('⚡ QUICK USERS TABLE VERIFICATION');
    console.log('=================================');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Test 1: Can we query "Users" (capital U)?
    console.log('\n🔍 Test 1: Checking "Users" (capital U) table...');
    try {
      const usersResult = await sequelize.query('SELECT COUNT(*) as count FROM "Users"', {
        type: QueryTypes.SELECT
      });
      console.log(`✅ "Users" table accessible - ${usersResult[0].count} users found`);
      console.log('🎉 SUCCESS: "Users" table case-sensitivity issue RESOLVED!');
      return { usersTable: true, count: usersResult[0].count };
    } catch (usersError) {
      console.log('❌ "Users" table still not accessible:', usersError.message);
      
      // Test 2: Check if "users" (lowercase) exists
      console.log('\n🔍 Test 2: Checking "users" (lowercase) table...');
      try {
        const lowercaseResult = await sequelize.query('SELECT COUNT(*) as count FROM users', {
          type: QueryTypes.SELECT
        });
        console.log(`✅ "users" table found - ${lowercaseResult[0].count} users`);
        console.log('⚠️ Issue: "users" exists but "Users" still not accessible');
        console.log('🔧 Need to create alias/view: "Users" -> "users"');
        return { usersTable: false, lowercaseExists: true, count: lowercaseResult[0].count };
      } catch (lowercaseError) {
        console.log('❌ "users" table also not found:', lowercaseError.message);
        console.log('🚨 CRITICAL: No user table exists at all!');
        return { usersTable: false, lowercaseExists: false };
      }
    }
    
  } catch (error) {
    console.error('💥 Verification error:', error.message);
    return { error: error.message };
  } finally {
    await sequelize.close();
  }
};

quickUsersCheck().then(result => {
  console.log('\n🎯 VERIFICATION RESULT:');
  console.log('=======================');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.usersTable) {
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Restart backend server');
    console.log('2. Should see all 43 models load correctly');
    console.log('3. Cart functionality should work');
  } else if (result.lowercaseExists) {
    console.log('\n🔧 NEED TO FIX:');
    console.log('Run: node robust-users-table-fix.mjs');
  } else {
    console.log('\n🚨 CRITICAL ISSUE:');
    console.log('User table missing entirely - database setup required');
  }
});
