#!/usr/bin/env node

/**
 * COMPREHENSIVE PRODUCTION FIX - Cart & Session Schema
 * ===================================================
 * This script fixes BOTH issues in one go:
 * 1. Missing StorefrontItems packages (cart 404 errors)
 * 2. Missing Session.reason column (session errors)
 * 
 * This is the DEFINITIVE fix that addresses both problems.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Production-safe package definitions
const PRODUCTION_PACKAGES = [
  {
    id: 1, name: "Single Session", description: "Experience premium personal training with Sean Swan in a single focused session.",
    packageType: "fixed", sessions: 1, pricePerSession: 175, price: 175, totalSessions: 1, isActive: true, displayOrder: 1
  },
  {
    id: 2, name: "Silver Package", description: "8 premium training sessions - perfect for getting started on your fitness journey.",
    packageType: "fixed", sessions: 8, pricePerSession: 170, price: 1360, totalSessions: 8, isActive: true, displayOrder: 2
  },
  {
    id: 3, name: "Gold Package", description: "20 comprehensive training sessions designed to build lasting fitness habits.",
    packageType: "fixed", sessions: 20, pricePerSession: 165, price: 3300, totalSessions: 20, isActive: true, displayOrder: 3
  },
  {
    id: 4, name: "Platinum Package", description: "50 premium sessions for complete fitness transformation and lifestyle change.",
    packageType: "fixed", sessions: 50, pricePerSession: 160, price: 8000, totalSessions: 50, isActive: true, displayOrder: 4
  },
  {
    id: 5, name: "3-Month Excellence", description: "Intensive 3-month program with 4 sessions per week for rapid results.",
    packageType: "monthly", months: 3, sessionsPerWeek: 4, totalSessions: 48, pricePerSession: 155, price: 7440, isActive: true, displayOrder: 5
  },
  {
    id: 6, name: "6-Month Mastery", description: "6 months of consistent training to build unbreakable fitness habits.",
    packageType: "monthly", months: 6, sessionsPerWeek: 4, totalSessions: 96, pricePerSession: 150, price: 14400, isActive: true, displayOrder: 6
  },
  {
    id: 7, name: "9-Month Transformation", description: "Complete lifestyle transformation over 9 months of dedicated training.",
    packageType: "monthly", months: 9, sessionsPerWeek: 4, totalSessions: 144, pricePerSession: 145, price: 20880, isActive: true, displayOrder: 7
  },
  {
    id: 8, name: "12-Month Elite Program", description: "The ultimate yearly commitment for maximum results and lifelong fitness.",
    packageType: "monthly", months: 12, sessionsPerWeek: 4, totalSessions: 192, pricePerSession: 140, price: 26880, isActive: true, displayOrder: 8
  }
];

async function fixSessionSchema(sequelize) {
  console.log('🔧 FIXING SESSION SCHEMA ISSUES');
  console.log('===============================');
  
  try {
    // Use raw SQL to check and add missing columns
    console.log('📋 Checking sessions table schema...');
    
    // Check if reason column exists
    const [reasonExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'reason'
      ) as exists;
    `);
    
    if (!reasonExists[0].exists) {
      console.log('❌ Session.reason column missing - ADDING NOW...');
      await sequelize.query(`
        ALTER TABLE sessions ADD COLUMN reason VARCHAR(255);
      `);
      console.log('✅ Added Session.reason column');
    } else {
      console.log('✅ Session.reason column already exists');
    }
    
    // Check isRecurring column
    const [isRecurringExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'isRecurring'
      ) as exists;
    `);
    
    if (!isRecurringExists[0].exists) {
      console.log('❌ Session.isRecurring column missing - ADDING NOW...');
      await sequelize.query(`
        ALTER TABLE sessions ADD COLUMN "isRecurring" BOOLEAN DEFAULT false;
      `);
      console.log('✅ Added Session.isRecurring column');
    } else {
      console.log('✅ Session.isRecurring column already exists');
    }
    
    // Check recurringPattern column
    const [recurringPatternExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'recurringPattern'
      ) as exists;
    `);
    
    if (!recurringPatternExists[0].exists) {
      console.log('❌ Session.recurringPattern column missing - ADDING NOW...');
      await sequelize.query(`
        ALTER TABLE sessions ADD COLUMN "recurringPattern" JSON;
      `);
      console.log('✅ Added Session.recurringPattern column');
    } else {
      console.log('✅ Session.recurringPattern column already exists');
    }
    
    console.log('🎉 Session schema fix completed!');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Session schema fix failed:', error.message);
    
    // Try alternative approach with conditional SQL
    try {
      console.log('🔄 Trying alternative SQL approach...');
      
      await sequelize.query(`
        DO $$
        BEGIN
          -- Add reason column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sessions' AND column_name = 'reason'
          ) THEN
            ALTER TABLE sessions ADD COLUMN reason VARCHAR(255);
            RAISE NOTICE 'Added reason column';
          END IF;
          
          -- Add isRecurring column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sessions' AND column_name = 'isRecurring'
          ) THEN
            ALTER TABLE sessions ADD COLUMN "isRecurring" BOOLEAN DEFAULT false;
            RAISE NOTICE 'Added isRecurring column';
          END IF;
          
          -- Add recurringPattern column if it doesn't exist
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'sessions' AND column_name = 'recurringPattern'
          ) THEN
            ALTER TABLE sessions ADD COLUMN "recurringPattern" JSON;
            RAISE NOTICE 'Added recurringPattern column';
          END IF;
        END $$;
      `);
      
      console.log('✅ Alternative SQL approach succeeded!');
      return { success: true };
      
    } catch (altError) {
      console.error('❌ Alternative approach also failed:', altError.message);
      return { success: false, error: altError.message };
    }
  }
}

async function testSessionQueries(sequelize) {
  console.log('\n🧪 TESTING SESSION QUERIES');
  console.log('===========================');
  
  try {
    // Test a simple session query to verify schema is working
    const [sessionCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM sessions;
    `);
    
    console.log(`✅ Session query test passed - ${sessionCount[0].count} sessions in database`);
    
    // Test the specific query that was failing
    try {
      const [testQuery] = await sequelize.query(`
        SELECT id, "sessionDate", duration, "userId", "trainerId", location, notes, reason, "isRecurring", "recurringPattern", status
        FROM sessions 
        LIMIT 1;
      `);
      
      console.log('✅ Full session query test passed - all columns accessible');
      
    } catch (queryError) {
      console.error('❌ Full session query test failed:', queryError.message);
      return { success: false, error: queryError.message };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Session query tests failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function fixStorefrontPackages(sequelize) {
  console.log('\n🛒 FIXING STOREFRONT PACKAGES');
  console.log('==============================');
  
  try {
    const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
    
    const results = { created: 0, updated: 0, failed: 0 };
    
    for (const packageData of PRODUCTION_PACKAGES) {
      try {
        const [item, created] = await StorefrontItem.upsert({
          id: packageData.id,
          name: packageData.name,
          description: packageData.description,
          packageType: packageData.packageType,
          sessions: packageData.sessions,
          months: packageData.months,
          sessionsPerWeek: packageData.sessionsPerWeek,
          totalSessions: packageData.totalSessions,
          pricePerSession: packageData.pricePerSession,
          price: packageData.price,
          totalCost: packageData.price,
          isActive: packageData.isActive,
          displayOrder: packageData.displayOrder,
          createdAt: new Date(),
          updatedAt: new Date()
        }, { returning: true });
        
        if (created) {
          console.log(`   ✅ CREATED package ID ${packageData.id}: ${packageData.name}`);
          results.created++;
        } else {
          console.log(`   🔄 UPDATED package ID ${packageData.id}: ${packageData.name}`);
          results.updated++;
        }
        
      } catch (error) {
        console.error(`   ❌ FAILED package ID ${packageData.id}: ${error.message}`);
        results.failed++;
      }
    }
    
    return { success: results.failed === 0, results };
    
  } catch (error) {
    console.error('❌ Storefront package fix failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function comprehensiveProductionFix() {
  console.log('🚀 COMPREHENSIVE PRODUCTION FIX');
  console.log('================================');
  console.log('Fixing BOTH cart functionality AND session schema issues\n');
  
  try {
    // Connect to database
    console.log('📊 Connecting to database...');
    const { default: sequelize } = await import('./backend/database.mjs');
    
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    const dialect = sequelize.getDialect();
    console.log(`📊 Connected to ${dialect} database\n`);
    
    // Step 1: Fix Session Schema Issues
    const sessionResult = await fixSessionSchema(sequelize);
    if (!sessionResult.success) {
      console.log('⚠️  Session schema fix had issues, but continuing with package fix...');
    }
    
    // Step 2: Test Session Queries
    const queryResult = await testSessionQueries(sequelize);
    if (!queryResult.success) {
      console.log('⚠️  Session query tests failed, but continuing...');
    }
    
    // Step 3: Fix Storefront Packages
    const packageResult = await fixStorefrontPackages(sequelize);
    
    // Step 4: Final verification
    console.log('\n📊 FINAL VERIFICATION');
    console.log('=====================');
    
    try {
      const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
      const finalPackages = await StorefrontItem.findAll({
        where: { isActive: true },
        attributes: ['id', 'name', 'price'],
        order: [['id', 'ASC']]
      });
      
      console.log(`✅ ${finalPackages.length} packages ready for cart operations`);
      
      // Test session model access
      try {
        const { default: Session } = await import('./backend/models/Session.mjs');
        const sessionCount = await Session.count();
        console.log(`✅ Session model working - ${sessionCount} sessions accessible`);
      } catch (sessionError) {
        console.log(`⚠️  Session model test: ${sessionError.message}`);
      }
      
    } catch (verifyError) {
      console.log(`⚠️  Final verification issue: ${verifyError.message}`);
    }
    
    await sequelize.close();
    
    // Summary
    console.log('\n🎉 COMPREHENSIVE FIX COMPLETED!');
    console.log('===============================');
    console.log(`Session schema: ${sessionResult.success ? '✅ Fixed' : '⚠️  Issues remain'}`);
    console.log(`Session queries: ${queryResult.success ? '✅ Working' : '⚠️  Issues remain'}`);
    console.log(`Package creation: ${packageResult.success ? '✅ Success' : '❌ Failed'}`);
    
    if (sessionResult.success && packageResult.success) {
      console.log('\n🛒 CART FUNCTIONALITY SHOULD NOW WORK!');
      console.log('📅 SESSION ERRORS SHOULD BE RESOLVED!');
      console.log('\n🧪 Test at: https://ss-pt-new.onrender.com');
    } else {
      console.log('\n⚠️  Some issues remain - check the output above');
    }
    
    return {
      success: sessionResult.success && packageResult.success,
      sessionFixed: sessionResult.success,
      packagesFixed: packageResult.success
    };
    
  } catch (error) {
    console.error('\n💥 COMPREHENSIVE FIX FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    
    return { success: false, error: error.message };
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  comprehensiveProductionFix()
    .then((result) => {
      if (result.success) {
        console.log('\n🎊 ALL PRODUCTION ISSUES FIXED!');
        console.log('Both cart and session functionality should now work properly');
        process.exit(0);
      } else {
        console.log('\n💥 SOME ISSUES REMAIN - See details above');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Script execution failed:', error);
      process.exit(1);
    });
}

export default comprehensiveProductionFix;
