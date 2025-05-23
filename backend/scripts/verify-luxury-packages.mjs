/**
 * SwanStudios Luxury Package Verification Script
 * =============================================
 * Verifies that all 8 luxury swan-themed packages are correctly created
 * with exact pricing and elegant rare element names.
 */

import StorefrontItem from '../models/StorefrontItem.mjs';
import logger from '../utils/logger.mjs';

// Expected luxury packages with exact pricing
const expectedLuxuryPackages = [
  {
    name: 'Silver Swan Wing',
    packageType: 'fixed',
    sessions: 1,
    pricePerSession: 175.00,
    totalCost: 175.00
  },
  {
    name: 'Golden Swan Flight',
    packageType: 'fixed',
    sessions: 8,
    pricePerSession: 170.00,
    totalCost: 1360.00
  },
  {
    name: 'Sapphire Swan Soar',
    packageType: 'fixed',
    sessions: 20,
    pricePerSession: 165.00,
    totalCost: 3300.00
  },
  {
    name: 'Platinum Swan Grace',
    packageType: 'fixed',
    sessions: 50,
    pricePerSession: 160.00,
    totalCost: 8000.00
  },
  {
    name: 'Emerald Swan Evolution',
    packageType: 'monthly',
    months: 3,
    sessionsPerWeek: 4,
    totalSessions: 52,
    pricePerSession: 155.00,
    totalCost: 8060.00
  },
  {
    name: 'Diamond Swan Dynasty',
    packageType: 'monthly',
    months: 6,
    sessionsPerWeek: 4,
    totalSessions: 104,
    pricePerSession: 150.00,
    totalCost: 15600.00
  },
  {
    name: 'Ruby Swan Reign',
    packageType: 'monthly',
    months: 9,
    sessionsPerWeek: 4,
    totalSessions: 156,
    pricePerSession: 145.00,
    totalCost: 22620.00
  },
  {
    name: 'Rhodium Swan Royalty',
    packageType: 'monthly',
    months: 12,
    sessionsPerWeek: 4,
    totalSessions: 208,
    pricePerSession: 140.00,
    totalCost: 29120.00
  }
];

async function verifyLuxuryPackages() {
  try {
    logger.info('🦢 Verifying SwanStudios luxury package collection...');
    
    // Get all packages from database
    const packages = await StorefrontItem.findAll({
      order: [['displayOrder', 'ASC'], ['id', 'ASC']]
    });
    
    logger.info(`💎 Found ${packages.length} packages in database`);
    
    if (packages.length !== expectedLuxuryPackages.length) {
      logger.error(`❌ Expected ${expectedLuxuryPackages.length} luxury packages, but found ${packages.length}`);
      return false;
    }
    
    let allCorrect = true;
    const errors = [];
    
    // Verify each luxury package
    for (let i = 0; i < expectedLuxuryPackages.length; i++) {
      const expected = expectedLuxuryPackages[i];
      const actual = packages.find(p => p.name === expected.name);
      
      if (!actual) {
        errors.push(`❌ Missing luxury package: ${expected.name}`);
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
        
        const element = expected.name.split(' ')[0]; // Extract element (Silver, Golden, etc.)
        logger.info(`✅ ${actual.name}: $${actual.totalCost} (${sessionsText} @ $${actual.pricePerSession}/session) 💎${element}`);
      }
    }
    
    // Report results
    if (allCorrect) {
      logger.info('\n🎉 All luxury packages are correctly configured!');
      logger.info('\n🦢 SwanStudios Luxury Collection Summary:');
      logger.info('==========================================');
      
      packages.forEach(pkg => {
        const sessionsText = pkg.packageType === 'fixed' 
          ? `${pkg.sessions} sessions` 
          : `${pkg.totalSessions} sessions (${pkg.months} months)`;
        
        const element = pkg.name.split(' ')[0];
        logger.info(`💎 ${pkg.name}: $${pkg.totalCost} (${sessionsText} @ $${pkg.pricePerSession}/session)`);
      });
      
      logger.info('\n✨ Luxury Progression Verification:');
      logger.info('- Rare elements: Silver → Golden → Sapphire → Platinum');
      logger.info('- Swan themes: Wing → Flight → Soar → Grace');
      logger.info('- Monthly evolution: Evolution → Dynasty → Reign → Royalty');
      logger.info('- Pricing progression: $175 → $140 per session');
      logger.info('\n🚀 SwanStudios luxury collection ready for premium clients!');
      return true;
    } else {
      logger.error('\n❌ Luxury package verification failed:');
      errors.forEach(error => logger.error(error));
      logger.error('\n💡 Run "npm run seed-luxury-packages" to fix these issues');
      return false;
    }
    
  } catch (error) {
    logger.error('💥 Error during luxury package verification:', error);
    return false;
  }
}

// Allow direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyLuxuryPackages()
    .then((success) => {
      if (success) {
        logger.info('🦢 Luxury package verification completed successfully!');
        process.exit(0);
      } else {
        logger.error('💥 Luxury package verification failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      logger.error('💥 Luxury package verification error:', error);
      process.exit(1);
    });
}

export default verifyLuxuryPackages;
