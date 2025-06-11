'use strict';

/**
 * SwanStudios Database Verification Script
 * Checks the current state of the database schema and foreign key relationships
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  }
});

async function verifyDatabase() {
  console.log('🔍 SwanStudios Database Verification');
  console.log('=====================================');
  
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    // Check users table and ID type
    console.log('\n📊 Users Table Analysis:');
    const [userIdInfo] = await sequelize.query(`
      SELECT data_type, column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id';
    `);
    
    if (userIdInfo.length > 0) {
      const userIdType = userIdInfo[0].data_type;
      console.log(`✅ Users.id data type: ${userIdType.toUpperCase()}`);
      
      // Check all tables that should exist
      console.log('\n📋 Table Existence Check:');
      const expectedTables = [
        'users',
        'storefront_items',
        'shopping_carts', 
        'cart_items',
        'orders',
        'order_items',
        'sessions',
        'notifications',
        'contacts',
        'admin_settings'
      ];
      
      for (const tableName of expectedTables) {
        const [tableExists] = await sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
          );
        `);
        
        if (tableExists[0].exists) {
          console.log(`✅ ${tableName} - EXISTS`);
        } else {
          console.log(`❌ ${tableName} - MISSING`);
        }
      }
      
      // Check foreign key relationships
      console.log('\n🔗 Foreign Key Compatibility Check:');
      const [foreignKeyColumns] = await sequelize.query(`
        SELECT 
          table_name,
          column_name,
          data_type,
          CASE 
            WHEN data_type = '${userIdType}' THEN 'COMPATIBLE'
            ELSE 'INCOMPATIBLE'
          END as compatibility_status
        FROM information_schema.columns 
        WHERE column_name IN ('userId', 'senderId')
        AND table_schema = 'public'
        ORDER BY table_name;
      `);
      
      if (foreignKeyColumns.length > 0) {
        foreignKeyColumns.forEach(col => {
          const status = col.compatibility_status === 'COMPATIBLE' ? '✅' : '❌';
          console.log(`${status} ${col.table_name}.${col.column_name} (${col.data_type}) - ${col.compatibility_status}`);
        });
      } else {
        console.log('⚠️  No foreign key columns found');
      }
      
      // Check migration status
      console.log('\n📝 Migration Status:');
      const [migrations] = await sequelize.query(`
        SELECT name FROM "SequelizeMeta" 
        ORDER BY name;
      `);
      
      console.log(`✅ ${migrations.length} migrations completed`);
      
      // Check for recent critical migrations
      const criticalMigrations = [
        '20250528000000-add-trainer-id-to-sessions.cjs',
        '20250528000001-repair-sessions-table.cjs', 
        '20250528000002-fix-uuid-foreign-keys.cjs',
        '20250528000005-definitive-uuid-fix.cjs'
      ];
      
      console.log('\n🔧 Critical Migration Status:');
      criticalMigrations.forEach(migration => {
        const completed = migrations.some(m => m.name === migration);
        const status = completed ? '✅' : '❌';
        console.log(`${status} ${migration}`);
      });
      
      // Final assessment
      console.log('\n🎯 Final Assessment:');
      
      // Count missing tables
      const missingTables = [];
      for (const tableName of expectedTables) {
        const [tableExists] = await sequelize.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${tableName}'
          );
        `);
        if (!tableExists[0].exists) {
          missingTables.push(tableName);
        }
      }
      
      // Count incompatible foreign keys
      const incompatibleForeignKeys = foreignKeyColumns.filter(col => 
        col.compatibility_status === 'INCOMPATIBLE'
      );
      
      if (missingTables.length === 0 && incompatibleForeignKeys.length === 0) {
        console.log('🎉 DATABASE SCHEMA IS COMPLETE AND CONSISTENT!');
        console.log('✅ All required tables exist');
        console.log('✅ All foreign key relationships are compatible');
        console.log('✅ SwanStudios platform is ready for production');
      } else {
        console.log('⚠️  DATABASE NEEDS ATTENTION:');
        if (missingTables.length > 0) {
          console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
        }
        if (incompatibleForeignKeys.length > 0) {
          console.log(`❌ Incompatible foreign keys: ${incompatibleForeignKeys.length}`);
        }
        console.log('🔧 Run the definitive migration fix to resolve these issues');
      }
      
    } else {
      console.log('❌ Users table not found or missing ID column');
    }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Run verification
verifyDatabase();
