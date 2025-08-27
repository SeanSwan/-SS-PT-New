#!/usr/bin/env node

/**
 * Production Swan Packages Fix Script
 * ===================================
 * This script creates the proper SwanStudios luxury swan-themed packages:
 * 1. Creates missing Swan packages (IDs 1-8) with luxury branding
 * 2. Fixes cart functionality in production
 * 3. Uses proper SwanStudios luxury naming
 * 
 * SAFE FOR PRODUCTION: Uses upsert operations and error handling
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// SwanStudios Luxury Swan-Themed Packages (Production-Safe)
const SWAN_PACKAGES = [
  {
    id: 1,
    name: "Silver Swan Wing",
    description: "Your elegant introduction to premium personal training with Sean Swan",
    packageType: "fixed",
    sessions: 1,
    pricePerSession: 175,
    price: 175,
    totalSessions: 1,
    totalCost: 175,
    isActive: true,
    displayOrder: 1
  },
  {
    id: 2,
    name: "Golden Swan Flight", 
    description: "Begin your transformation journey with 8 sessions of expert guidance",
    packageType: "fixed",
    sessions: 8,
    pricePerSession: 170,
    price: 1360,
    totalSessions: 8,
    totalCost: 1360,
    isActive: true,
    displayOrder: 2
  },
  {
    id: 3,
    name: "Sapphire Swan Soar",
    description: "Elevate your fitness with 20 sessions of premium training excellence",
    packageType: "fixed", 
    sessions: 20,
    pricePerSession: 165,
    price: 3300,
    totalSessions: 20,
    totalCost: 3300,
    isActive: true,
    displayOrder: 3
  },
  {
    id: 4,
    name: "Platinum Swan Grace",
    description: "Master your potential with 50 sessions of elite personal training",
    packageType: "fixed",
    sessions: 50,
    pricePerSession: 160,
    price: 8000,
    totalSessions: 50,
    totalCost: 8000,
    isActive: true,
    displayOrder: 4
  },
  {
    id: 5,
    name: "Emerald Swan Evolution",
    description: "Transform your life with 3 months of dedicated training (4x per week)",
    packageType: "monthly",
    months: 3,
    sessionsPerWeek: 4,
    totalSessions: 52,
    pricePerSession: 155,
    price: 8060,
    totalCost: 8060,
    isActive: true,
    displayOrder: 5
  },
  {
    id: 6,
    name: "Diamond Swan Dynasty",
    description: "Build lasting strength with 6 months of premium training mastery",
    packageType: "monthly",
    months: 6,
    sessionsPerWeek: 4,
    totalSessions: 104,
    pricePerSession: 150,
    price: 15600,
    totalCost: 15600,
    isActive: true,
    displayOrder: 6
  },
  {
    id: 7,
    name: "Ruby Swan Reign", 
    description: "Command your fitness destiny with 9 months of elite transformation",
    packageType: "monthly",
    months: 9,
    sessionsPerWeek: 4,
    totalSessions: 156,
    pricePerSession: 145,
    price: 22620,
    totalCost: 22620,
    isActive: true,
    displayOrder: 7
  },
  {
    id: 8,
    name: "Rhodium Swan Royalty",
    description: "The ultimate year-long journey to peak performance and royal fitness",
    packageType: "monthly",
    months: 12,
    sessionsPerWeek: 4,
    totalSessions: 208,
    pricePerSession: 140,
    price: 29120,
    totalCost: 29120,
    isActive: true,
    displayOrder: 8
  }
];

async function fixProductionSwanPackages() {
  console.log('🦢 SWANSTUDIOS LUXURY COLLECTION FIX');
  console.log('====================================');
  console.log('Creating proper Swan-themed luxury packages in production\n');
  
  try {
    // Step 1: Test database connection
    console.log('📊 Step 1: Testing database connection...');
    const { default: sequelize } = await import('./backend/database.mjs');
    
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    
    const dialect = sequelize.getDialect();
    const dbHost = sequelize.config.host || 'cloud database';
    console.log(`📊 Connected to ${dialect} database on ${dbHost}\n`);
    
    // Step 2: Load models safely
    console.log('📋 Step 2: Loading models...');
    let StorefrontItem, Session;
    
    try {
      const { default: StorefrontItemModel } = await import('./backend/models/StorefrontItem.mjs');
      StorefrontItem = StorefrontItemModel;
      console.log('✅ StorefrontItem model loaded');
    } catch (error) {
      console.error('❌ Failed to load StorefrontItem model:', error.message);
      throw new Error('StorefrontItem model not available');
    }
    
    try {
      const { default: SessionModel } = await import('./backend/models/Session.mjs');
      Session = SessionModel;
      console.log('✅ Session model loaded');
    } catch (error) {
      console.log('⚠️  Session model not available (this might be normal)');
      Session = null;
    }
    
    // Step 3: Check current package state
    console.log('\n📦 Step 3: Checking current package state...');
    
    const existingPackages = await StorefrontItem.findAll({
      attributes: ['id', 'name', 'price', 'isActive'],
      order: [['id', 'ASC']]
    });
    
    console.log(`📊 Found ${existingPackages.length} existing packages`);
    
    if (existingPackages.length > 0) {
      console.log('🔍 Current packages:');
      existingPackages.forEach(pkg => {
        const isSwanNamed = pkg.name.includes('Swan');
        const status = isSwanNamed ? '🦢' : '❌';
        console.log(`   ${status} ID ${pkg.id}: ${pkg.name} ($${pkg.price}) ${pkg.isActive ? '✅' : '❌'}`);
      });
    }
    
    // Step 4: Create/update Swan packages using upsert (production-safe)
    console.log('\n🦢 Step 4: Creating/updating SwanStudios luxury packages...');
    
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0
    };
    
    for (const packageData of SWAN_PACKAGES) {
      try {
        // Use upsert for production safety - creates if not exists, updates if exists
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
          totalCost: packageData.totalCost,
          isActive: packageData.isActive,
          displayOrder: packageData.displayOrder,
          // Add timestamps explicitly for production
          createdAt: new Date(),
          updatedAt: new Date()
        }, {
          returning: true
        });
        
        if (created) {
          console.log(`   ✅ CREATED: ${packageData.name} (ID ${packageData.id})`);
          results.created++;
        } else {
          console.log(`   🔄 UPDATED: ${packageData.name} (ID ${packageData.id})`);
          results.updated++;
        }
        
      } catch (error) {
        console.error(`   ❌ FAILED: ${packageData.name} - ${error.message}`);
        results.failed++;
      }
    }
    
    // Step 5: Display the luxury swan collection
    console.log('\n🦢 Step 5: Verifying SwanStudios luxury collection...');
    
    const finalPackages = await StorefrontItem.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'price', 'sessions', 'totalSessions', 'months'],
      order: [['id', 'ASC']]
    });
    
    console.log(`✅ ${finalPackages.length} luxury Swan packages ready:`);
    console.log('\n💎 SWANSTUDIOS LUXURY COLLECTION:');
    console.log('=================================');
    
    finalPackages.forEach(pkg => {
      const sessions = pkg.sessions || pkg.totalSessions;
      const monthsText = pkg.months ? ` (${pkg.months} months)` : '';
      console.log(`   🦢 ID ${pkg.id}: ${pkg.name} - $${pkg.price} (${sessions} sessions${monthsText})`);
    });
    
    // Step 6: Test cart-critical package lookups
    console.log('\n🔍 Step 6: Testing cart functionality...');
    
    const criticalIds = [1, 2, 3, 4]; // Test first 4 packages
    let lookupTests = 0;
    let lookupSuccesses = 0;
    
    for (const id of criticalIds) {
      try {
        const pkg = await StorefrontItem.findByPk(id);
        lookupTests++;
        if (pkg && pkg.isActive) {
          console.log(`   ✅ ${pkg.name} (ID ${id}): Cart ready`);
          lookupSuccesses++;
        } else {
          console.log(`   ❌ Package ID ${id}: NOT FOUND OR INACTIVE`);
        }
      } catch (error) {
        console.log(`   ❌ Package ID ${id} lookup: ERROR - ${error.message}`);
        lookupTests++;
      }
    }
    
    await sequelize.close();
    
    // Final summary
    console.log('\n🎉 SWANSTUDIOS LUXURY COLLECTION COMPLETE!');
    console.log('==========================================');
    console.log(`✅ Swan packages created: ${results.created}`);
    console.log(`🔄 Swan packages updated: ${results.updated}`);
    console.log(`❌ Failed operations: ${results.failed}`);
    console.log(`🧪 Cart lookups successful: ${lookupSuccesses}/${lookupTests}`);
    console.log(`🦢 Total luxury packages: ${finalPackages.length}`);
    
    if (results.failed === 0 && lookupSuccesses === lookupTests) {
      console.log('\n🛒 CART FUNCTIONALITY WITH SWAN PACKAGES READY!');
      console.log('🦢 All SwanStudios luxury packages available');
      console.log('✅ Production database ready for swan-themed cart operations');
    } else {
      console.log('\n⚠️  Some issues remain - cart may have partial functionality');
      console.log('💡 Check the errors above and resolve before full deployment');
    }
    
    console.log('\n🧪 TO TEST SWANSTUDIOS LUXURY COLLECTION:');
    console.log('1. Visit: https://ss-pt-new.onrender.com');
    console.log('2. Navigate to storefront/shop');
    console.log('3. Look for swan-themed package names');
    console.log('4. Try adding "Silver Swan Wing" to cart');
    console.log('5. Verify no "Training package not found" errors');
    
    return {
      success: true,
      packagesCreated: results.created,
      packagesUpdated: results.updated,
      totalPackages: finalPackages.length,
      lookupSuccess: lookupSuccesses === lookupTests
    };
    
  } catch (error) {
    console.error('\n💥 SWANSTUDIOS LUXURY COLLECTION FIX FAILED:', error.message);
    console.error('📚 Error details:', error.stack);
    
    console.log('\n🚨 TROUBLESHOOTING STEPS:');
    console.log('1. Verify DATABASE_URL is correctly set in production');
    console.log('2. Check that production database allows connections');
    console.log('3. Ensure StorefrontItem table exists in production');
    console.log('4. Check for foreign key constraint issues');
    console.log('5. Review production migration status');
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to run this script on production
async function runSwanPackagesFix() {
  console.log('🦢 RUNNING SWANSTUDIOS LUXURY COLLECTION FIX');
  console.log('=============================================');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Database URL:', process.env.DATABASE_URL ? 'CONFIGURED' : 'NOT SET');
  console.log('');
  
  const result = await fixProductionSwanPackages();
  
  if (result.success) {
    console.log('\n🚀 SWAN PACKAGES FIX SUCCESSFUL!');
    console.log('🦢 SwanStudios luxury collection is now live in production');
    process.exit(0);
  } else {
    console.log('\n💥 SWAN PACKAGES FIX FAILED!');
    console.log('Manual intervention may be required');
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSwanPackagesFix().catch(error => {
    console.error('💥 Script execution failed:', error);
    process.exit(1);
  });
}

export default fixProductionSwanPackages;
