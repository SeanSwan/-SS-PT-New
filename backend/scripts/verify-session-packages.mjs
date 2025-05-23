/**
 * Session Package Verification Script
 * ==================================
 * Verifies that all 8 SwanStudios session packages are correctly created
 * with the exact pricing as specified.
 */

import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

// Expected packages with exact pricing
const expectedPackages = [
  {
    name: '1 Session Package',
    packageType: 'fixed',
    sessions: 1,
    pricePerSession: 175.00,
    totalCost: 175.00
  },
  {
    name: '8 Session Package',
    packageType: 'fixed',
    sessions: 8,
    pricePerSession: 170.00,
    totalCost: 1360.00
  },
  {
    name: '20 Session Package',
    packageType: 'fixed',
    sessions: 20,
    pricePerSession: 165.00,
    totalCost: 3300.00
  },
  {
    name: '50 Session Package',
    packageType: 'fixed',
    sessions: 50,
    pricePerSession: 160.00,
    totalCost: 8000.00
  },
  {
    name: '3 Month Package (4x/week)',
    packageType: 'monthly',
    months: 3,
    sessionsPerWeek: 4,
    totalSessions: 52,
    pricePerSession: 155.00,
    totalCost: 8060.00
  },
  {
    name: '6 Month Package (4x/week)',
    packageType: 'monthly',
    months: 6,
    sessionsPerWeek: 4,
    totalSessions: 104,
    pricePerSession: 150.00,
    totalCost: 15600.00
  },
  {
    name: '9 Month Package (4x/week)',
    packageType: 'monthly',
    months: 9,
    sessionsPerWeek: 4,
    totalSessions: 156,
    pricePerSession: 145.00,
    totalCost: 22620.00
  },
  {
    name: '12 Month Package (4x/week)',
    packageType: 'monthly',
    months: 12,
    sessionsPerWeek: 4,
    totalSessions: 208,
    pricePerSession: 140.00,
    totalCost: 29120.00
  }
];

async function verifySessionPackages() {
  try {
    logger.info('🔍 Verifying SwanStudios session packages...');
    
    // Get all packages from database
    const packages = await StorefrontItem.findAll({
      order: [['displayOrder', 'ASC'], ['id', 'ASC']]
    });
    
    logger.info(`📦 Found ${packages.length} packages in database`);
    
    if (packages.length !== expectedPackages.length) {
      logger.error(`❌ Expected ${expectedPackages.length} packages, but found ${packages.length}`);
      return false;
    }
    
    let allCorrect = true;
    const errors = [];
    
    // Verify each package
    for (let i = 0; i < expectedPackages.length; i++) {
      const expected = expectedPackages[i];
      const actual = packages.find(p => p.name === expected.name);
      
      if (!actual) {
        errors.push(`❌ Missing package: ${expected.name}`);
        allCorrect = false;
        continue;
      }
      
      // Check key fields
      const checks = [
        { field: 'packageType', expected: expected.packageType, actual: actual.packageType },
        { field: 'pricePerSession', expected: parseFloat(expected.pricePerSession), actual: parseFloat(actual.pricePerSession) },
        { field: 'totalCost', expected: parseFloat(expected.totalCost), actual: parseFloat(actual.totalCost) },
        { field: 'price', expected: parseFloat(expected.totalCost), actual: parseFloat(actual.price) }
      ];
      
      // Add type-specific checks
      if (expected.packageType === 'fixed') {
        checks.push({ field: 'sessions', expected: expected.sessions, actual: actual.sessions });
      } else if (expected.packageType === 'monthly') {
        checks.push(
          { field: 'months', expected: expected.months, actual: actual.months },
          { field: 'sessionsPerWeek', expected: expected.sessionsPerWeek, actual: actual.sessionsPerWeek },
          { field: 'totalSessions', expected: expected.totalSessions, actual: actual.totalSessions }
        );
      }
      
      // Validate each field
      let packageCorrect = true;
      for (const check of checks) {
        if (check.expected !== check.actual) {
          errors.push(`❌ ${actual.name}: ${check.field} should be ${check.expected}, got ${check.actual}`);
          packageCorrect = false;
          allCorrect = false;
        }
      }
      
      if (packageCorrect) {
        const sessionsText = expected.packageType === 'fixed' 
          ? `${expected.sessions} sessions` 
          : `${expected.totalSessions} sessions (${expected.months} months)`;
        logger.info(`✅ ${actual.name}: $${actual.totalCost} (${sessionsText} @ $${actual.pricePerSession}/session)`);
      }
    }
    
    // Report results
    if (allCorrect) {
      logger.info('\n🎉 All session packages are correctly configured!');
      logger.info('\n📋 Package Summary:');
      logger.info('==================');
      
      packages.forEach(pkg => {
        const sessionsText = pkg.packageType === 'fixed' 
          ? `${pkg.sessions} sessions` 
          : `${pkg.totalSessions} sessions (${pkg.months} months)`;
        logger.info(`${pkg.name}: $${pkg.totalCost} (${sessionsText} @ $${pkg.pricePerSession}/session)`);
      });
      
      logger.info('\n💰 Pricing Verification:');
      logger.info('- Rates range from $175 to $140 per session');
      logger.info('- Volume discounts properly applied');
      logger.info('- Monthly packages offer best value');
      logger.info('\n✅ All packages ready for production!');
      return true;
    } else {
      logger.error('\n❌ Package verification failed:');
      errors.forEach(error => logger.error(error));
      logger.error('\n💡 Run "npm run seed-correct-packages" to fix these issues');
      return false;
    }
    
  } catch (error) {
    logger.error('💥 Error during package verification:', error);
    return false;
  }
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  verifySessionPackages()
    .then((success) => {
      if (success) {
        logger.info('🚀 Package verification completed successfully!');
        process.exit(0);
      } else {
        logger.error('💥 Package verification failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error('💥 Package verification error:', error);
      process.exit(1);
    });
}

export default verifySessionPackages;
