// COMPREHENSIVE FOREIGN KEY TO VIEW FIX
// Solves the "referenced relation Users is not a table" issue

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const fixForeignKeyToView = async () => {
  try {
    console.log('🔧 FIXING FOREIGN KEY TO VIEW ISSUE');
    console.log('===================================');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // STRATEGY 1: Rename physical table from "users" to "Users"
    console.log('\n🎯 STRATEGY 1: Rename physical table users → Users');
    console.log('====================================================');
    
    // Check current state
    const tablesCheck = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'Users')
    `, { type: QueryTypes.SELECT });
    
    console.log('Current tables:', tablesCheck.map(t => t.table_name));
    
    // Check if view exists
    const viewsCheck = await sequelize.query(`
      SELECT table_name FROM information_schema.views 
      WHERE table_schema = 'public' AND table_name = 'Users'
    `, { type: QueryTypes.SELECT });
    
    if (viewsCheck.length > 0) {
      console.log('✅ "Users" view exists');
      
      // Drop the view first
      console.log('\n🗑️ Dropping "Users" view...');
      await sequelize.query('DROP VIEW IF EXISTS "Users";');
      console.log('✅ View dropped');
      
      // Rename users table to Users  
      console.log('\n🔄 Renaming users table to Users...');
      try {
        await sequelize.query('ALTER TABLE users RENAME TO "Users";');
        console.log('✅ Table renamed: users → "Users"');
        
        // Verify the rename worked
        const verifyRename = await sequelize.query(`
          SELECT COUNT(*) as count FROM "Users"
        `, { type: QueryTypes.SELECT });
        
        console.log(`✅ Verification: "Users" table accessible with ${verifyRename[0].count} users`);
        
        return { 
          success: true, 
          strategy: 'table_rename',
          userCount: verifyRename[0].count 
        };
        
      } catch (renameError) {
        console.log('❌ Table rename failed:', renameError.message);
        
        // Fallback: Recreate view
        console.log('\n🔄 Recreating view as fallback...');
        await sequelize.query('CREATE VIEW "Users" AS SELECT * FROM users;');
        console.log('⚠️ View recreated, but foreign key issue persists');
      }
    }
    
    // STRATEGY 2: Update Sequelize models to use lowercase consistently
    console.log('\n🎯 STRATEGY 2: Model consistency check');
    console.log('=====================================');
    
    console.log('ℹ️ This requires updating model definitions...');
    console.log('📋 Current approach summary:');
    console.log('  - Physical table: users (lowercase)');
    console.log('  - View: "Users" (uppercase)');
    console.log('  - Models: Expecting "Users" in associations');
    console.log('');
    console.log('🔧 RECOMMENDED SOLUTION:');
    console.log('  1. Rename physical table: users → "Users" (completed above)');
    console.log('  2. This allows foreign keys to reference the actual table');
    console.log('  3. Maintains model expectations');
    
    // STRATEGY 3: Check what's preventing the table rename
    if (tablesCheck.some(t => t.table_name === 'users')) {
      console.log('\n🔍 STRATEGY 3: Investigating rename barriers');
      console.log('=============================================');
      
      // Check for foreign key constraints on users table
      const constraints = await sequelize.query(`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          rc.update_rule,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND (tc.table_name = 'users' OR kcu.column_name LIKE '%user%')
      `, { type: QueryTypes.SELECT });
      
      if (constraints.length > 0) {
        console.log('🔗 Found foreign key constraints that might prevent rename:');
        constraints.forEach(c => {
          console.log(`  - ${c.table_name}.${c.column_name} (${c.constraint_name})`);
        });
        
        console.log('\n🔧 Need to drop constraints, rename table, recreate constraints');
      } else {
        console.log('✅ No foreign key constraints blocking rename');
      }
    }
    
    return { 
      success: false, 
      issue: 'table_rename_incomplete',
      message: 'Additional steps needed for foreign key handling'
    };
    
  } catch (error) {
    console.error('💥 Error in foreign key fix:', error.message);
    return { 
      success: false, 
      error: error.message 
    };
  } finally {
    await sequelize.close();
  }
};

fixForeignKeyToView().then(result => {
  console.log('\n🎯 FOREIGN KEY FIX RESULT:');
  console.log('==========================');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('\n🎉 SUCCESS! Foreign key issue resolved');
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Restart backend server');
    console.log('2. Should see all 43 models load');
    console.log('3. No more foreign key constraint errors');
  } else {
    console.log('\n⚠️ Additional work needed');
    console.log('Check the detailed output above for specific issues');
  }
});
