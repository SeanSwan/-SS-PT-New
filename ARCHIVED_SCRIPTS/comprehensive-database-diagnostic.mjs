// COMPREHENSIVE DATABASE DIAGNOSTIC
// Understands exactly what's wrong with the database queries

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const comprehensiveDatabaseDiagnostic = async () => {
  try {
    console.log('🔬 COMPREHENSIVE DATABASE DIAGNOSTIC');
    console.log('====================================');
    
    // Test basic connection
    console.log('\n1️⃣ TESTING BASIC CONNECTION:');
    console.log('-----------------------------');
    
    await sequelize.authenticate();
    console.log('✅ Sequelize.authenticate() successful');
    
    // Test simple query
    console.log('\n2️⃣ TESTING SIMPLE QUERY:');
    console.log('-------------------------');
    
    const simpleResult = await sequelize.query('SELECT 1 as test');
    console.log('Simple query result:', simpleResult);
    console.log('Simple query result type:', typeof simpleResult);
    console.log('Simple query is array:', Array.isArray(simpleResult));
    if (Array.isArray(simpleResult)) {
      console.log('Simple query length:', simpleResult.length);
      console.log('Simple query first element:', simpleResult[0]);
    }
    
    // Test with explicit QueryTypes.SELECT
    console.log('\n3️⃣ TESTING WITH QueryTypes.SELECT:');
    console.log('----------------------------------');
    
    const typedResult = await sequelize.query('SELECT 1 as test', { type: QueryTypes.SELECT });
    console.log('Typed query result:', typedResult);
    console.log('Typed query result type:', typeof typedResult);
    console.log('Typed query is array:', Array.isArray(typedResult));
    if (Array.isArray(typedResult)) {
      console.log('Typed query length:', typedResult.length);
      console.log('Typed query first element:', typedResult[0]);
    }
    
    // Test database version and info
    console.log('\n4️⃣ TESTING DATABASE INFO:');
    console.log('--------------------------');
    
    try {
      const versionResult = await sequelize.query('SELECT version()', { type: QueryTypes.SELECT });
      console.log('Database version:', versionResult[0]);
    } catch (vError) {
      console.log('Version query error:', vError.message);
    }
    
    try {
      const dbResult = await sequelize.query('SELECT current_database()', { type: QueryTypes.SELECT });
      console.log('Current database:', dbResult[0]);
    } catch (dbError) {
      console.log('Database name query error:', dbError.message);
    }
    
    try {
      const userResult = await sequelize.query('SELECT current_user', { type: QueryTypes.SELECT });
      console.log('Current user:', userResult[0]);
    } catch (userError) {
      console.log('User query error:', userError.message);
    }
    
    // Test information_schema access
    console.log('\n5️⃣ TESTING INFORMATION_SCHEMA ACCESS:');
    console.log('-------------------------------------');
    
    try {
      const schemaResult = await sequelize.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        ORDER BY schema_name
      `, { type: QueryTypes.SELECT });
      
      console.log('Available schemas:', schemaResult);
    } catch (schemaError) {
      console.log('Schema query error:', schemaError.message);
    }
    
    // Test the problematic table query step by step
    console.log('\n6️⃣ TESTING TABLE QUERY (STEP BY STEP):');
    console.log('--------------------------------------');
    
    // Step 6a: Raw query without QueryTypes
    console.log('\n6a. Raw query without QueryTypes:');
    try {
      const rawTableResult = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `);
      
      console.log('Raw table query result:', rawTableResult);
      console.log('Raw table query type:', typeof rawTableResult);
      console.log('Raw table query is array:', Array.isArray(rawTableResult));
      
      if (Array.isArray(rawTableResult)) {
        console.log('Raw table query length:', rawTableResult.length);
        rawTableResult.forEach((item, index) => {
          console.log(`Raw item ${index}:`, item);
          console.log(`Raw item ${index} type:`, typeof item);
          if (typeof item === 'object') {
            console.log(`Raw item ${index} keys:`, Object.keys(item || {}));
          }
        });
      }
    } catch (rawError) {
      console.log('Raw table query error:', rawError.message);
    }
    
    // Step 6b: Query with QueryTypes.SELECT
    console.log('\n6b. Query with QueryTypes.SELECT:');
    try {
      const typedTableResult = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        LIMIT 5
      `, { type: QueryTypes.SELECT });
      
      console.log('Typed table query result:', typedTableResult);
      console.log('Typed table query type:', typeof typedTableResult);
      console.log('Typed table query is array:', Array.isArray(typedTableResult));
      
      if (Array.isArray(typedTableResult)) {
        console.log('Typed table query length:', typedTableResult.length);
        typedTableResult.forEach((item, index) => {
          console.log(`Typed item ${index}:`, item);
          console.log(`Typed item ${index} type:`, typeof item);
          if (typeof item === 'object') {
            console.log(`Typed item ${index} keys:`, Object.keys(item || {}));
            console.log(`Typed item ${index} table_name:`, item.table_name);
          }
        });
      }
    } catch (typedError) {
      console.log('Typed table query error:', typedError.message);
    }
    
    // Test alternative table listing methods
    console.log('\n7️⃣ TESTING ALTERNATIVE TABLE METHODS:');
    console.log('-------------------------------------');
    
    // Method A: pg_tables
    console.log('\n7a. Using pg_tables:');
    try {
      const pgTablesResult = await sequelize.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        LIMIT 5
      `, { type: QueryTypes.SELECT });
      
      console.log('pg_tables result:', pgTablesResult);
    } catch (pgError) {
      console.log('pg_tables error:', pgError.message);
    }
    
    // Method B: pg_class
    console.log('\n7b. Using pg_class:');
    try {
      const pgClassResult = await sequelize.query(`
        SELECT relname as table_name
        FROM pg_class 
        WHERE relkind = 'r' AND relnamespace = (
          SELECT oid FROM pg_namespace WHERE nspname = 'public'
        )
        LIMIT 5
      `, { type: QueryTypes.SELECT });
      
      console.log('pg_class result:', pgClassResult);
    } catch (pgClassError) {
      console.log('pg_class error:', pgClassError.message);
    }
    
    // Summary
    console.log('\n🎯 DIAGNOSTIC SUMMARY:');
    console.log('======================');
    console.log('If this diagnostic shows the table queries working correctly,');
    console.log('then the issue in the original script was likely:');
    console.log('1. Missing QueryTypes.SELECT parameter');
    console.log('2. Incorrect result format handling');
    console.log('3. Unexpected query result structure');
    
    return true;
    
  } catch (error) {
    console.error('💥 Diagnostic error:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  } finally {
    await sequelize.close();
  }
};

comprehensiveDatabaseDiagnostic().then(success => {
  console.log(`\n🎯 DIAGNOSTIC ${success ? 'COMPLETED' : 'FAILED'}`);
});
