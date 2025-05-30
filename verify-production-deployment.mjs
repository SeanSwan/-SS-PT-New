#!/usr/bin/env node

/**
 * SwanStudios Production Deployment Verification
 * =============================================
 * This script verifies the current state and provides next steps
 * for deploying the cart functionality fix to production.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function checkLocalState() {
  console.log('🔍 CHECKING LOCAL DATABASE STATE');
  console.log('=================================');
  
  try {
    const { default: sequelize } = await import('./backend/database.mjs');
    const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
    
    await sequelize.authenticate();
    console.log('✅ Local database connection successful');
    
    const localPackages = await StorefrontItem.findAll({
      attributes: ['id', 'name', 'price', 'isActive'],
      order: [['id', 'ASC']]
    });
    
    console.log(`📦 Local database has ${localPackages.length} packages:`);
    
    if (localPackages.length === 0) {
      console.log('❌ NO PACKAGES FOUND IN LOCAL DATABASE!');
      console.log('💡 Run local fix first: node fix-cart-packages.mjs');
      await sequelize.close();
      return { localReady: false, packages: [] };
    }
    
    // Check for required IDs 1-8
    const requiredIds = [1, 2, 3, 4, 5, 6, 7, 8];
    const existingIds = localPackages.map(p => p.id);
    const missingIds = requiredIds.filter(id => !existingIds.includes(id));
    
    localPackages.forEach(pkg => {
      const status = pkg.isActive ? '✅' : '❌';
      console.log(`   ${status} ID ${pkg.id}: ${pkg.name} ($${pkg.price})`);
    });
    
    if (missingIds.length > 0) {
      console.log(`❌ Missing package IDs: ${missingIds.join(', ')}`);
      console.log('💡 Run: node fix-cart-packages.mjs');
      await sequelize.close();
      return { localReady: false, packages: localPackages };
    }
    
    console.log('✅ Local database is ready with all required packages!');
    await sequelize.close();
    return { localReady: true, packages: localPackages };
    
  } catch (error) {
    console.error('❌ Local database check failed:', error.message);
    return { localReady: false, error: error.message };
  }
}

async function checkProductionReadiness() {
  console.log('\n🌐 CHECKING PRODUCTION READINESS');
  console.log('=================================');
  
  const checks = [
    {
      name: 'Local packages ready',
      check: () => true, // We checked this above
      status: 'pending'
    },
    {
      name: 'Production DATABASE_URL configured',
      check: () => !!process.env.DATABASE_URL,
      status: 'pending'
    },
    {
      name: 'Production fix script exists',
      check: async () => {
        try {
          const fs = await import('fs');
          return fs.existsSync('./production-database-fix.mjs');
        } catch {
          return false;
        }
      },
      status: 'pending'
    },
    {
      name: 'Render startup script updated',
      check: async () => {
        try {
          const fs = await import('fs');
          const content = fs.readFileSync('./backend/scripts/render-start.mjs', 'utf8');
          return content.includes('runProductionDataFix');
        } catch {
          return false;
        }
      },
      status: 'pending'
    }
  ];
  
  for (const check of checks) {
    try {
      const result = typeof check.check === 'function' ? await check.check() : check.check;
      check.status = result ? '✅' : '❌';
      console.log(`${check.status} ${check.name}`);
    } catch (error) {
      check.status = '❌';
      console.log(`❌ ${check.name} - Error: ${error.message}`);
    }
  }
  
  const allPassed = checks.every(c => c.status === '✅');
  
  if (allPassed) {
    console.log('\n🎉 ALL READINESS CHECKS PASSED!');
    console.log('✅ Ready for production deployment');
  } else {
    console.log('\n⚠️  Some readiness checks failed');
    console.log('💡 Address the issues above before deploying');
  }
  
  return { ready: allPassed, checks };
}

function provideDeploymentInstructions(localState, readinessState) {
  console.log('\n📋 DEPLOYMENT INSTRUCTIONS');
  console.log('===========================');
  
  if (!localState.localReady) {
    console.log('🚨 FIRST: Fix local database');
    console.log('   Command: node fix-cart-packages.mjs');
    console.log('   Then: rerun this verification script\n');
    return;
  }
  
  if (!readinessState.ready) {
    console.log('🚨 FIRST: Address readiness check failures above\n');
    return;
  }
  
  console.log('🎯 RECOMMENDED DEPLOYMENT APPROACH:');
  console.log('');
  
  console.log('📋 Option 1: Direct Production Fix (FASTEST)');
  console.log('   1. Ensure production DATABASE_URL in .env');
  console.log('   2. Run: node production-database-fix.mjs');
  console.log('   3. Test: https://ss-pt-new.onrender.com');
  console.log('');
  
  console.log('📋 Option 2: Deploy with Auto-Fix (SAFEST)');
  console.log('   1. git add .');
  console.log('   2. git commit -m "Fix production cart functionality"');
  console.log('   3. git push origin main');
  console.log('   4. Wait for Render auto-deploy');
  console.log('   5. Check Render logs for "Production data fix successful"');
  console.log('');
  
  console.log('📋 Option 3: Manual Render Console');
  console.log('   1. Deploy to Render via git');
  console.log('   2. Open Render service console');
  console.log('   3. Run: node ../production-database-fix.mjs');
  console.log('');
  
  console.log('🧪 TESTING CHECKLIST:');
  console.log('   □ Visit production site');
  console.log('   □ Navigate to storefront');
  console.log('   □ Login with test account');
  console.log('   □ Click "Add to Cart" on any package');
  console.log('   □ Verify no "Training package not found" errors');
  console.log('   □ Confirm cart shows added items');
}

async function main() {
  console.log('🦢 SWANSTUDIOS PRODUCTION DEPLOYMENT VERIFICATION');
  console.log('================================================');
  console.log('Checking readiness to fix production cart functionality\n');
  
  // Step 1: Check local state
  const localState = await checkLocalState();
  
  // Step 2: Check production readiness
  const readinessState = await checkProductionReadiness();
  
  // Step 3: Provide instructions
  provideDeploymentInstructions(localState, readinessState);
  
  // Final summary
  console.log('\n📊 SUMMARY');
  console.log('===========');
  console.log(`Local database: ${localState.localReady ? '✅ Ready' : '❌ Needs fixing'}`);
  console.log(`Production readiness: ${readinessState.ready ? '✅ Ready' : '❌ Issues found'}`);
  console.log(`Local packages: ${localState.packages ? localState.packages.length : 0}`);
  
  if (localState.localReady && readinessState.ready) {
    console.log('\n🚀 STATUS: READY FOR PRODUCTION DEPLOYMENT!');
    console.log('💡 Choose Option 1 for fastest fix, Option 2 for safest approach');
  } else {
    console.log('\n⚠️  STATUS: NOT READY - Address issues above first');
  }
  
  process.exit(localState.localReady && readinessState.ready ? 0 : 1);
}

main().catch(error => {
  console.error('💥 Verification script failed:', error);
  process.exit(1);
});
