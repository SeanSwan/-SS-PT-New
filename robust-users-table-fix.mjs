// ROBUST Users Table Case-Sensitivity Fix
// Handles the Step 1 failure with comprehensive error handling

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const robustUsersTableFix = async () => {
  try {
    console.log('🔧 ROBUST USERS TABLE CASE-SENSITIVITY FIX');
    console.log('==========================================');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // METHOD 1: Robust table listing with explicit QueryTypes
    console.log('\n🔍 METHOD 1: Listing tables with QueryTypes.SELECT...');
    
    let allTables = [];
    try {
      const result = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `, { 
        type: QueryTypes.SELECT,
        logging: console.log  // Show the actual SQL being executed
      });
      
      console.log('📊 Raw query result type:', typeof result);
      console.log('📊 Raw query result length:', Array.isArray(result) ? result.length : 'Not an array');
      console.log('📊 First result item:', result[0]);
      
      if (Array.isArray(result) && result.length > 0) {
        // Check the structure of the first result
        const firstItem = result[0];
        console.log('📊 First item keys:', Object.keys(firstItem || {}));
        
        if (firstItem && firstItem.table_name) {
          allTables = result.map(row => row.table_name);
          console.log(`✅ METHOD 1 SUCCESS: Found ${allTables.length} tables`);
        } else {
          console.log('❌ METHOD 1: table_name property not found in results');
          throw new Error('Invalid result structure');
        }
      } else {
        console.log('❌ METHOD 1: No results or invalid result format');
        throw new Error('No tables found or invalid format');
      }
    } catch (method1Error) {
      console.log('❌ METHOD 1 FAILED:', method1Error.message);
      
      // METHOD 2: Alternative query format
      console.log('\n🔍 METHOD 2: Trying alternative table query...');
      try {
        const altResult = await sequelize.query(`
          SELECT tablename as table_name 
          FROM pg_tables 
          WHERE schemaname = 'public' 
          ORDER BY tablename;
        `, { type: QueryTypes.SELECT });
        
        console.log('📊 Alternative result:', altResult);
        
        if (Array.isArray(altResult) && altResult.length > 0 && altResult[0].table_name) {
          allTables = altResult.map(row => row.table_name);
          console.log(`✅ METHOD 2 SUCCESS: Found ${allTables.length} tables`);
        } else {
          throw new Error('Alternative method also failed');
        }
      } catch (method2Error) {
        console.log('❌ METHOD 2 FAILED:', method2Error.message);
        
        // METHOD 3: Raw SQL with manual parsing
        console.log('\n🔍 METHOD 3: Raw SQL approach...');
        try {
          const rawResult = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
          console.log('📊 Raw result structure:', rawResult);
          
          // Handle different result formats
          let tableData = rawResult[0]; // First element is usually the data
          if (Array.isArray(tableData)) {
            // Extract table names from various possible structures
            allTables = tableData.map(row => {
              if (typeof row === 'object' && row.tablename) return row.tablename;
              if (typeof row === 'object' && row.table_name) return row.table_name;
              if (Array.isArray(row)) return row[0]; // Might be array of arrays
              return row;
            }).filter(name => name && typeof name === 'string');
            
            console.log(`✅ METHOD 3 SUCCESS: Found ${allTables.length} tables`);
          } else {
            throw new Error('Raw method also failed');
          }
        } catch (method3Error) {
          console.log('❌ METHOD 3 FAILED:', method3Error.message);
          console.log('🚨 ALL METHODS FAILED - Database access issue!');
          return { success: false, issue: 'database_access_failure' };
        }
      }
    }
    
    // SUCCESS: We have table names, now check for Users table issue
    console.log('\n📋 TABLES FOUND:');
    allTables.forEach(tableName => console.log(`  - ${tableName}`));
    
    // Find user-related tables
    const userTables = allTables.filter(name => 
      name && typeof name === 'string' && name.toLowerCase().includes('user')
    );
    
    console.log('\n👥 USER-RELATED TABLES:');
    userTables.forEach(tableName => console.log(`  - ${tableName}`));
    
    // Check specific variations
    const hasUsers = allTables.includes('Users');        // Capital U
    const hasLowercaseUsers = allTables.includes('users'); // lowercase u
    
    console.log('\n📊 USER TABLE ANALYSIS:');
    console.log(`  "Users" (capital U): ${hasUsers ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  "users" (lowercase u): ${hasLowercaseUsers ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // Apply the appropriate fix
    if (hasLowercaseUsers && !hasUsers) {
      console.log('\n🔧 APPLYING FIX: Creating "Users" alias for "users"...');
      
      try {
        // Create a view that maps "Users" to "users"
        await sequelize.query('DROP VIEW IF EXISTS "Users";');
        await sequelize.query('CREATE VIEW "Users" AS SELECT * FROM users;');
        console.log('✅ Created "Users" view pointing to "users" table');
        
        // Verify the fix
        const testResult = await sequelize.query('SELECT COUNT(*) as count FROM "Users";', {
          type: QueryTypes.SELECT
        });
        console.log(`✅ Verification: "Users" view accessible with ${testResult[0].count} records`);
        
        return { 
          success: true, 
          action: 'created_view',
          userCount: testResult[0].count
        };
        
      } catch (fixError) {
        console.log('❌ Error creating view:', fixError.message);
        
        // Alternative: Try renaming the table
        console.log('\n🔄 Trying table rename instead...');
        try {
          await sequelize.query('ALTER TABLE users RENAME TO "Users";');
          console.log('✅ Renamed table from "users" to "Users"');
          
          return { 
            success: true, 
            action: 'renamed_table'
          };
        } catch (renameError) {
          console.log('❌ Table rename also failed:', renameError.message);
          return { 
            success: false, 
            issue: 'fix_failed',
            error: renameError.message 
          };
        }
      }
    } else if (hasUsers && !hasLowercaseUsers) {
      console.log('\n✅ "Users" table already exists with correct case');
      return { success: true, action: 'already_correct' };
    } else if (hasUsers && hasLowercaseUsers) {
      console.log('\n⚠️ Both "Users" and "users" tables exist - need manual intervention');
      return { 
        success: false, 
        issue: 'both_tables_exist',
        message: 'Manual database cleanup required'
      };
    } else {
      console.log('\n🚨 NO USER TABLE FOUND AT ALL!');
      return { 
        success: false, 
        issue: 'no_user_table',
        message: 'User table must be created from scratch'
      };
    }
    
  } catch (error) {
    console.error('💥 Critical error in robust fix:', error.message);
    console.error('Stack trace:', error.stack);
    return { 
      success: false, 
      issue: 'critical_error',
      error: error.message 
    };
  } finally {
    await sequelize.close();
  }
};

robustUsersTableFix().then(result => {
  console.log('\n🎯 ROBUST FIX RESULT:');
  console.log('====================');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('\n🚀 SUCCESS! You can now proceed with:');
    console.log('1. Restart your backend server');
    console.log('2. Check that all 43 models load correctly');
    console.log('3. Test cart functionality');
  } else {
    console.log('\n🚨 FAILED! Next steps:');
    console.log('1. Check database permissions');
    console.log('2. Verify PostgreSQL is running correctly');
    console.log('3. Check database connection settings');
  }
});
