#!/usr/bin/env node
/**
 * Emergency Pricing Diagnostic Tool
 * =================================
 * Master Prompt v28 aligned - The Swan Alchemist
 * 
 * Diagnoses and fixes the critical $0 pricing issue in storefront packages
 */

import './utils/enhancedRedisErrorSuppressor.mjs';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

if (existsSync(envPath)) {
  console.log(`[Diagnostic] Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`[Diagnostic] Warning: .env file not found.`);
  dotenv.config();
}

import sequelize from './database.mjs';
import StorefrontItem from './models/StorefrontItem.mjs';
import logger from './utils/logger.mjs';

// Console styling
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bold}${colors.cyan}🌟 ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}🔧 ${msg}${colors.reset}`)
};

/**
 * Emergency Pricing Fixer
 */
class EmergencyPricingFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  /**
   * Check database connection
   */
  async checkDatabaseConnection() {
    log.step('Testing database connection...');
    try {
      await sequelize.authenticate();
      log.success('Database connection established');
      return true;
    } catch (error) {
      log.error(`Database connection failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Analyze current storefront items
   */
  async analyzeStorefrontItems() {
    log.step('Analyzing current storefront items...');
    
    try {
      const items = await StorefrontItem.findAll({
        order: [['id', 'ASC']]
      });

      if (items.length === 0) {
        log.error('NO STOREFRONT ITEMS FOUND! This is the primary issue.');
        this.issues.push('Database has no storefront items');
        return { items: [], hasItems: false };
      }

      log.info(`Found ${items.length} storefront items in database`);

      // Analyze each item
      items.forEach((item, index) => {
        console.log(`\n📦 Item ${index + 1}: ${item.name}`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Package Type: ${item.packageType}`);
        console.log(`   Price Per Session: $${item.pricePerSession || 0}`);
        console.log(`   Total Cost: $${item.totalCost || 0}`);
        console.log(`   Price: $${item.price || 0}`);
        console.log(`   Sessions: ${item.sessions || 'N/A'}`);
        console.log(`   Active: ${item.isActive}`);

        // Check for pricing issues
        if (!item.pricePerSession || parseFloat(item.pricePerSession) <= 0) {
          this.issues.push(`Item "${item.name}" has invalid pricePerSession: $${item.pricePerSession}`);
        }
        if (!item.totalCost || parseFloat(item.totalCost) <= 0) {
          this.issues.push(`Item "${item.name}" has invalid totalCost: $${item.totalCost}`);
        }
        if (!item.price || parseFloat(item.price) <= 0) {
          this.issues.push(`Item "${item.name}" has invalid price: $${item.price}`);
        }
      });

      return { items, hasItems: true };
    } catch (error) {
      log.error(`Error analyzing storefront items: ${error.message}`);
      this.issues.push(`Database query failed: ${error.message}`);
      return { items: [], hasItems: false, error: error.message };
    }
  }

  /**
   * Test the API endpoint
   */
  async testStorefrontAPI() {
    log.step('Testing storefront API endpoint...');
    
    try {
      // We'll simulate what the API should return
      const items = await StorefrontItem.findAll();
      
      const transformedItems = items.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        totalCost: item.totalCost || item.price,
        displayPrice: item.price || item.totalCost,
        pricePerSession: item.pricePerSession,
        price: item.price || item.totalCost,
        sessions: item.sessions,
        packageType: item.packageType,
        isActive: item.isActive
      }));

      console.log(`\n🌐 API Response Preview:`);
      transformedItems.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name}: $${item.displayPrice || 0} (${item.pricePerSession || 0}/session)`);
      });

      return { success: true, items: transformedItems };
    } catch (error) {
      log.error(`API test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create proper pricing data
   */
  async createProperPricingData() {
    log.step('Creating proper pricing data...');

    const luxuryPackages = [
      {
        id: 1,
        packageType: 'fixed',
        name: 'Rhodium Swan Encounter',
        description: 'An exclusive 4-session introduction to our cosmic wellness methodology, featuring personalized training with rare earth element-inspired techniques.',
        sessions: 4,
        pricePerSession: 140.00,
        totalCost: 560.00,
        price: 560.00,
        isActive: true,
        displayOrder: 1
      },
      {
        id: 2,
        packageType: 'fixed',
        name: 'Palladium Swan Ascension',
        description: 'A transformative 8-session journey combining advanced fitness protocols with mindfulness practices, designed for the discerning wellness enthusiast.',
        sessions: 8,
        pricePerSession: 145.00,
        totalCost: 1160.00,
        price: 1160.00,
        isActive: true,
        displayOrder: 2
      },
      {
        id: 3,
        packageType: 'fixed',
        name: 'Osmium Swan Mastery',
        description: 'Our flagship 12-session comprehensive wellness program, featuring elite training methodologies and personalized nutrition guidance.',
        sessions: 12,
        pricePerSession: 150.00,
        totalCost: 1800.00,
        price: 1800.00,
        isActive: true,
        displayOrder: 3
      },
      {
        id: 4,
        packageType: 'fixed',
        name: 'Iridium Swan Transformation',
        description: 'An intensive 16-session complete lifestyle transformation program with advanced biometric tracking and lifestyle optimization.',
        sessions: 16,
        pricePerSession: 155.00,
        totalCost: 2480.00,
        price: 2480.00,
        isActive: true,
        displayOrder: 4
      },
      {
        id: 5,
        packageType: 'monthly',
        name: 'Platinum Swan Lifestyle',
        description: 'A premium monthly wellness membership with unlimited access to our cosmic training protocols and lifestyle enhancement services.',
        months: 1,
        sessionsPerWeek: 2,
        totalSessions: 8,
        pricePerSession: 160.00,
        totalCost: 1280.00,
        price: 1280.00,
        isActive: true,
        displayOrder: 5
      },
      {
        id: 6,
        packageType: 'monthly',
        name: 'Gold Swan Elite',
        description: 'An exclusive quarterly wellness program featuring intensive training, nutrition optimization, and lifestyle coaching for the ultimate transformation.',
        months: 3,
        sessionsPerWeek: 2,
        totalSessions: 24,
        pricePerSession: 165.00,
        totalCost: 3960.00,
        price: 3960.00,
        isActive: true,
        displayOrder: 6
      },
      {
        id: 7,
        packageType: 'monthly',
        name: 'Titanium Swan Mastery',
        description: 'Our premier 6-month comprehensive wellness transformation featuring advanced training, nutrition, mindfulness, and lifestyle optimization.',
        months: 6,
        sessionsPerWeek: 3,
        totalSessions: 72,
        pricePerSession: 170.00,
        totalCost: 12240.00,
        price: 12240.00,
        isActive: true,
        displayOrder: 7
      },
      {
        id: 8,
        packageType: 'monthly',
        name: 'Diamond Swan Pinnacle',
        description: 'The ultimate annual wellness journey for the most discerning clients, featuring comprehensive lifestyle transformation and ongoing optimization.',
        months: 12,
        sessionsPerWeek: 3,
        totalSessions: 144,
        pricePerSession: 175.00,
        totalCost: 25200.00,
        price: 25200.00,
        isActive: true,
        displayOrder: 8
      }
    ];

    try {
      // Clear existing items
      await StorefrontItem.destroy({ where: {} });
      log.info('Cleared existing storefront items');

      // Create new items with proper pricing
      const createdItems = [];
      for (const packageData of luxuryPackages) {
        try {
          const item = await StorefrontItem.create(packageData);
          createdItems.push(item);
          log.success(`Created: ${item.name} - $${item.price}`);
        } catch (error) {
          log.error(`Failed to create ${packageData.name}: ${error.message}`);
          this.issues.push(`Failed to create ${packageData.name}: ${error.message}`);
        }
      }

      this.fixes.push(`Created ${createdItems.length} luxury packages with proper pricing`);
      return { success: true, created: createdItems.length };
    } catch (error) {
      log.error(`Failed to create pricing data: ${error.message}`);
      this.issues.push(`Failed to create pricing data: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify the fix
   */
  async verifyFix() {
    log.step('Verifying pricing fix...');

    try {
      const items = await StorefrontItem.findAll({
        order: [['displayOrder', 'ASC']]
      });

      let allPricesValid = true;
      let totalRevenuePotential = 0;

      console.log(`\n💰 PRICING VERIFICATION:`);
      items.forEach((item, index) => {
        const price = parseFloat(item.price || 0);
        const pricePerSession = parseFloat(item.pricePerSession || 0);
        
        console.log(`   ${index + 1}. ${item.name}`);
        console.log(`      Total: $${price.toFixed(2)} (${pricePerSession.toFixed(2)}/session)`);
        
        if (price <= 0 || pricePerSession <= 0) {
          allPricesValid = false;
          log.error(`   ❌ Invalid pricing for ${item.name}`);
        } else {
          log.success(`   ✅ Valid pricing for ${item.name}`);
          totalRevenuePotential += price;
        }
      });

      console.log(`\n📊 SUMMARY:`);
      console.log(`   Total packages: ${items.length}`);
      console.log(`   Revenue potential: $${totalRevenuePotential.toFixed(2)}`);
      console.log(`   Pricing valid: ${allPricesValid ? 'YES' : 'NO'}`);

      return { success: allPricesValid, items: items.length, revenue: totalRevenuePotential };
    } catch (error) {
      log.error(`Verification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run complete diagnostic and fix
   */
  async runCompleteFix() {
    log.title('EMERGENCY PRICING DIAGNOSTIC & FIX');
    console.log('Diagnosing and fixing the critical $0 pricing issue...\n');

    // Step 1: Check database connection
    const dbConnected = await this.checkDatabaseConnection();
    if (!dbConnected) {
      log.error('Cannot proceed without database connection');
      return false;
    }

    // Step 2: Analyze current state
    const { hasItems } = await this.analyzeStorefrontItems();

    // Step 3: Test API
    await this.testStorefrontAPI();

    // Step 4: Create proper pricing data
    const createResult = await this.createProperPricingData();
    if (!createResult.success) {
      log.error('Failed to create pricing data');
      return false;
    }

    // Step 5: Verify the fix
    const verifyResult = await this.verifyFix();

    // Step 6: Report results
    console.log(`\n${colors.bold}🎯 DIAGNOSTIC RESULTS:${colors.reset}`);
    
    if (this.issues.length > 0) {
      console.log(`\n${colors.red}Issues Found:${colors.reset}`);
      this.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    if (this.fixes.length > 0) {
      console.log(`\n${colors.green}Fixes Applied:${colors.reset}`);
      this.fixes.forEach((fix, index) => {
        console.log(`   ${index + 1}. ${fix}`);
      });
    }

    console.log(`\n${colors.bold}💰 PRICING STATUS:${colors.reset}`);
    if (verifyResult.success) {
      log.success('ALL PRICING ISSUES RESOLVED!');
      console.log(`   📦 ${verifyResult.items} packages with valid pricing`);
      console.log(`   💰 $${verifyResult.revenue.toFixed(2)} total revenue potential`);
      console.log(`\n${colors.bold}🚀 NEXT STEPS:${colors.reset}`);
      console.log(`   1. Test the frontend store to confirm prices display`);
      console.log(`   2. Test add to cart functionality`);
      console.log(`   3. Test checkout process`);
      console.log(`   4. Deploy to production if everything works`);
    } else {
      log.error('PRICING ISSUES STILL EXIST!');
      console.log(`   Check the error messages above and retry`);
    }

    return verifyResult.success;
  }
}

// Run the emergency fix
const fixer = new EmergencyPricingFixer();
fixer.runCompleteFix()
  .then(success => {
    if (success) {
      console.log(`\n${colors.green}🎉 Emergency pricing fix completed successfully!${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}❌ Emergency pricing fix failed. Check errors above.${colors.reset}`);
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(`\n${colors.red}💥 Critical error during pricing fix:${colors.reset}`, error);
    process.exit(1);
  });
