#!/usr/bin/env node

/**
 * 🚨 QUICK SESSION.DELETEDAT FIX (Backend Directory Version)
 * ===========================================================
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables from current directory
dotenv.config();

console.log('🚨 QUICK SESSION.DELETEDAT FIX');
console.log('==============================');

const sequelize = new Sequelize(
  process.env.PG_DB || 'swanstudios',
  process.env.PG_USER || 'swanadmin',
  process.env.PG_PASSWORD || 'postgres',
  {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

async function quickFix() {
  try {
    console.log('📡 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected successfully');

    // Check if deletedAt exists
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'deletedAt';
    `);
    
    if (columns.length > 0) {
      console.log('✅ deletedAt column already exists - testing...');
    } else {
      console.log('❌ deletedAt column missing - adding now...');
      
      // Add the column
      await sequelize.query(`
        ALTER TABLE sessions 
        ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      `);
      
      console.log('✅ deletedAt column added');
    }

    // Test Session query
    const [testResult] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE "deletedAt" IS NULL;
    `);
    
    console.log(`✅ Test query successful - ${testResult[0].count} active sessions`);
    
    // Import and test Session model
    try {
      const { default: Session } = await import('./models/Session.mjs');
      const sessions = await Session.findAll({ limit: 1 });
      console.log('✅ Session model works - no more deletedAt error!');
    } catch (modelError) {
      console.log('⚠️ Session model test failed:', modelError.message);
    }

    console.log('\n🎉 SESSION.DELETEDAT FIX COMPLETE!');
    console.log('==================================');
    console.log('✅ Database schema fixed');
    console.log('✅ Session queries should work');
    console.log('\n🚀 Next: Start your servers and test API endpoints');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  } finally {
    await sequelize.close();
  }
}

quickFix();