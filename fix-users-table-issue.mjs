// Critical PostgreSQL Users Table Fix
// Resolves the "relation Users does not exist" error

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const fixUsersTableIssue = async () => {
  try {
    console.log('🚨 CRITICAL: Fixing PostgreSQL Users Table Issue');
    console.log('=================================================');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Check what tables actually exist
    console.log('\n🔍 Checking existing tables...');
    const tables = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `, { type: QueryTypes.SELECT });
    
    console.log('📋 Existing tables:');
    tables.forEach(table => console.log(`  - ${table.table_name}`));
    
    // Check if users table exists (case variations)
    const userTableVariations = tables.filter(table => 
      table.table_name.toLowerCase().includes('user')
    );
    
    console.log('\n👥 User-related tables found:');
    userTableVariations.forEach(table => console.log(`  - ${table.table_name}`));
    
    // Check foreign key references
    console.log('\n🔗 Checking foreign key constraints...');
    const fkConstraints = await sequelize.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY' 
        AND (ccu.table_name ILIKE '%user%' OR tc.table_name ILIKE '%user%');
    `, { type: QueryTypes.SELECT });
    
    console.log('📎 Foreign key constraints involving users:');
    fkConstraints.forEach(fk => {
      console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    
    // Check if Users table exists with capital U
    const hasCapitalUsers = tables.some(table => table.table_name === 'Users');
    const hasLowercaseUsers = tables.some(table => table.table_name === 'users');
    
    console.log(`\n📊 TABLE ANALYSIS:`);
    console.log(`  "Users" (capital): ${hasCapitalUsers ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  "users" (lowercase): ${hasLowercaseUsers ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (hasLowercaseUsers && !hasCapitalUsers) {
      console.log('\n🔧 ISSUE IDENTIFIED: Table is "users" but models expect "Users"');
      console.log('   This is a common Sequelize/PostgreSQL case-sensitivity issue');
      
      // Check the User model definition
      console.log('\n📝 RECOMMENDED FIXES:');
      console.log('1. Update User model to use lowercase table name');
      console.log('2. Or rename table to match model expectations');
      console.log('3. Update all foreign key references consistently');
      
      return {
        issue: 'case_mismatch',
        actualTable: 'users',
        expectedTable: 'Users',
        solution: 'update_model_tablename'
      };
    }
    
    if (!hasCapitalUsers && !hasLowercaseUsers) {
      console.log('\n🚨 CRITICAL: No users table found at all!');
      console.log('   Need to create users table first');
      
      return {
        issue: 'missing_table',
        solution: 'create_users_table'
      };
    }
    
    console.log('\n✅ Users table exists correctly');
    return { issue: 'none' };
    
  } catch (error) {
    console.error('💥 Error checking Users table:', error.message);
    return { issue: 'connection_error', error: error.message };
  } finally {
    await sequelize.close();
  }
};

fixUsersTableIssue().then(result => {
  console.log('\n🎯 RESULT:', JSON.stringify(result, null, 2));
});
