#!/usr/bin/env node

/**
 * 🚀 PRODUCTION SESSION.DELETEDAT FIX
 * ===================================
 * 
 * This script adds the deletedAt column to the production database on Render.
 * Run this BEFORE deploying your updated code.
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: './backend/.env' });

console.log('🚀 PRODUCTION SESSION.DELETEDAT FIX');
console.log('===================================');

// Production database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function fixProductionDatabase() {
  try {
    console.log('📡 Connecting to PRODUCTION database on Render...');
    await sequelize.authenticate();
    console.log('✅ Connected to production database');

    // Check if deletedAt column exists in production
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sessions' AND column_name = 'deletedAt';
    `);
    
    if (columns.length > 0) {
      console.log('✅ deletedAt column already exists in PRODUCTION');
      console.log('🎉 Production database is ready - no migration needed');
      return true;
    }

    console.log('❌ deletedAt column missing in PRODUCTION - adding now...');
    
    // Add the deletedAt column to production
    await sequelize.query(`
      ALTER TABLE sessions 
      ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);
    
    console.log('✅ deletedAt column added to PRODUCTION');

    // Add index for performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at_prod 
      ON sessions ("deletedAt");
    `);
    
    console.log('✅ Index added to PRODUCTION');

    // Test the fix on production
    const [testResult] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE "deletedAt" IS NULL;
    `);
    
    console.log(`✅ PRODUCTION test successful - ${testResult[0].count} active sessions`);

    console.log('\n🎉 PRODUCTION DATABASE FIX COMPLETE!');
    console.log('====================================');
    console.log('✅ Production deletedAt column added');
    console.log('✅ Production database ready for deployment');
    console.log('✅ Your live site should work after next deployment');

    return true;

  } catch (error) {
    console.error('❌ Production fix failed:', error.message);
    
    if (error.message.includes('permission denied')) {
      console.log('⚠️ Database permission issue - contact Render support');
    } else if (error.message.includes('connection')) {
      console.log('⚠️ Check DATABASE_URL in your .env file');
    }
    
    return false;
  } finally {
    await sequelize.close();
  }
}

fixProductionDatabase();