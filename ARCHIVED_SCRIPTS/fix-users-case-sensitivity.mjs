// CRITICAL: PostgreSQL Users Table Case-Sensitivity Fix
// This addresses the root cause: "relation Users does not exist"

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const fixUsersCaseSensitivity = async () => {
  try {
    console.log('🚨 CRITICAL FIX: PostgreSQL Users Table Case-Sensitivity');
    console.log('=====================================================');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // 1. Check what tables actually exist
    console.log('\n🔍 CHECKING ACTUAL TABLE NAMES:');
    const allTables = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `, { type: QueryTypes.SELECT });
    
    console.log('📋 All tables in database:');
    allTables.forEach(table => console.log(`  - ${table.table_name}`));
    
    // 2. Check user table variations
    const userTables = allTables.filter(t => t.table_name.toLowerCase().includes('user'));
    console.log('\n👥 User-related tables:');
    userTables.forEach(table => console.log(`  - ${table.table_name}`));
    
    const hasUsers = allTables.some(t => t.table_name === 'Users'); // Capital U
    const hasLowercaseUsers = allTables.some(t => t.table_name === 'users'); // lowercase u
    
    console.log(`\n📊 TABLE ANALYSIS:`);
    console.log(`  "Users" (capital): ${hasUsers ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  "users" (lowercase): ${hasLowercaseUsers ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // 3. THE CRITICAL FIX: Handle the case mismatch
    if (hasLowercaseUsers && !hasUsers) {
      console.log('\n🔧 CRITICAL ISSUE IDENTIFIED:');
      console.log('   Table exists as "users" but models expect "Users"');
      console.log('   This is causing "relation Users does not exist" errors');
      
      console.log('\n🛠️ APPLYING FIX: Creating alias/view for case consistency...');
      
      // Option 1: Create a view that maps "Users" to "users"
      try {
        await sequelize.query(`CREATE OR REPLACE VIEW "Users" AS SELECT * FROM users;`);
        console.log('✅ Created "Users" view pointing to "users" table');
      } catch (error) {
        console.log('❌ Error creating view:', error.message);
        
        // Option 2: Rename the table (more drastic)
        console.log('\n🔄 Attempting table rename...');
        try {
          await sequelize.query(`ALTER TABLE users RENAME TO "Users";`);
          console.log('✅ Renamed table from "users" to "Users"');
        } catch (renameError) {
          console.log('❌ Error renaming table:', renameError.message);
          return false;
        }
      }
    } else if (!hasUsers && !hasLowercaseUsers) {
      console.log('\n🚨 CRITICAL: NO USERS TABLE EXISTS AT ALL!');
      console.log('   This requires creating the users table from scratch');
      return false;
    } else if (hasUsers) {
      console.log('\n✅ "Users" table already exists with correct casing');
    }
    
    // 4. Verify the fix
    console.log('\n🔍 VERIFYING FIX:');
    try {
      const testQuery = await sequelize.query(`SELECT COUNT(*) as count FROM "Users";`);
      console.log(`✅ Can now query "Users" table - found ${testQuery[0][0].count} users`);
      return true;
    } catch (error) {
      console.log('❌ Still cannot query "Users" table:', error.message);
      return false;
    }
    
  } catch (error) {
    console.error('💥 Critical error:', error.message);
    return false;
  } finally {
    await sequelize.close();
  }
};

fixUsersCaseSensitivity().then(success => {
  console.log(`\n🎯 USERS TABLE FIX: ${success ? 'SUCCESS' : 'FAILED'}`);
  if (success) {
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Run: node fix-missing-columns.mjs');
    console.log('2. Restart backend server');
    console.log('3. Check that all 43 models load correctly');
  }
});
