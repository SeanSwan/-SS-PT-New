#!/usr/bin/env node

/**
 * Fix Cart Package IDs
 * ====================
 * This script diagnoses and fixes the "Training package not found" error
 * by ensuring the database has the correct packages and IDs match the frontend.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env');
if (existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log('Using default environment variables');
  dotenv.config();
}

// Define the packages that should exist (matching frontend)
const EXPECTED_PACKAGES = [
  {
    id: 1,
    name: "Single Session",
    description: "Try a premium training session with Sean Swan.",
    packageType: "fixed",
    sessions: 1,
    pricePerSession: 175,
    price: 175,
    totalSessions: 1,
    isActive: true,
    displayOrder: 1
  },
  {
    id: 2,
    name: "Silver Package", 
    description: "Perfect starter package with 8 premium training sessions.",
    packageType: "fixed",
    sessions: 8,
    pricePerSession: 170,
    price: 1360,
    totalSessions: 8,
    isActive: true,
    displayOrder: 2
  },
  {
    id: 3,
    name: "Gold Package",
    description: "Comprehensive training with 20 sessions for serious results.",
    packageType: "fixed", 
    sessions: 20,
    pricePerSession: 165,
    price: 3300,
    totalSessions: 20,
    isActive: true,
    displayOrder: 3
  },
  {
    id: 4,
    name: "Platinum Package",
    description: "Ultimate transformation with 50 premium sessions.",
    packageType: "fixed",
    sessions: 50,
    pricePerSession: 160,
    price: 8000,
    totalSessions: 50,
    isActive: true,
    displayOrder: 4
  },
  {
    id: 5,
    name: "3-Month Excellence",
    description: "Intensive 3-month program with 4 sessions per week.",
    packageType: "monthly",
    months: 3,
    sessionsPerWeek: 4,
    totalSessions: 48,
    pricePerSession: 155,
    price: 7440,
    isActive: true,
    displayOrder: 5
  },
  {
    id: 6,
    name: "6-Month Mastery",
    description: "Build lasting habits with 6 months of consistent training.",
    packageType: "monthly",
    months: 6,
    sessionsPerWeek: 4,
    totalSessions: 96,
    pricePerSession: 150,
    price: 14400,
    isActive: true,
    displayOrder: 6
  },
  {
    id: 7,
    name: "9-Month Transformation", 
    description: "Complete lifestyle transformation over 9 months.",
    packageType: "monthly",
    months: 9,
    sessionsPerWeek: 4,
    totalSessions: 144,
    pricePerSession: 145,
    price: 20880,
    isActive: true,
    displayOrder: 7
  },
  {
    id: 8,
    name: "12-Month Elite Program",
    description: "The ultimate yearly commitment for maximum results.",
    packageType: "monthly",
    months: 12,
    sessionsPerWeek: 4,
    totalSessions: 192,
    pricePerSession: 140,
    price: 26880,
    isActive: true,
    displayOrder: 8
  }
];

async function fixCartPackageIds() {
  try {
    console.log('🔧 FIXING CART PACKAGE IDS');
    console.log('===========================');
    
    // Import database and models
    const { default: sequelize } = await import('./backend/database.mjs');
    const { default: StorefrontItem } = await import('./backend/models/StorefrontItem.mjs');
    
    console.log('📊 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Check current packages
    const currentPackages = await StorefrontItem.findAll({
      order: [['id', 'ASC']]
    });
    
    console.log(`\n📦 Found ${currentPackages.length} existing packages in database:`);
    
    if (currentPackages.length === 0) {
      console.log('❌ NO PACKAGES FOUND - This is the root cause!');
      console.log('🔧 Creating the required packages...');
      await createRequiredPackages(StorefrontItem);
    } else {
      console.log('\n🔍 Checking if existing packages match frontend expectations...');
      
      // Check if all expected IDs exist
      const existingIds = currentPackages.map(p => p.id);
      const missingIds = EXPECTED_PACKAGES.map(p => p.id).filter(id => !existingIds.includes(id));
      
      if (missingIds.length > 0) {
        console.log(`❌ Missing packages with IDs: ${missingIds.join(', ')}`);
        console.log('🔧 Creating missing packages...');
        await createMissingPackages(StorefrontItem, missingIds);
      } else {
        console.log('✅ All expected package IDs exist in database');
        
        // Show current packages for verification
        console.log('\n📋 Current packages:');
        currentPackages.forEach(pkg => {
          console.log(`   ID ${pkg.id}: ${pkg.name} - $${pkg.price} (${pkg.sessions || pkg.totalSessions} sessions)`);
        });
      }
    }
    
    // Final verification
    console.log('\n🎯 FINAL VERIFICATION');
    console.log('=====================');
    
    const finalPackages = await StorefrontItem.findAll({
      where: { isActive: true },
      order: [['id', 'ASC']]
    });
    
    console.log(`✅ Database now has ${finalPackages.length} active packages`);
    console.log('\n🎯 Cart should now work with these package IDs:');
    
    finalPackages.forEach(pkg => {
      console.log(`   ✓ ID ${pkg.id}: ${pkg.name} ($${pkg.price})`);
    });
    
    await sequelize.close();
    
    return { 
      success: true, 
      totalPackages: finalPackages.length,
      packages: finalPackages.map(p => ({ id: p.id, name: p.name, price: p.price }))
    };
    
  } catch (error) {
    console.error('❌ ERROR fixing cart package IDs:', error.message);
    console.error('Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
}

async function createRequiredPackages(StorefrontItem) {
  console.log('🏗️  Creating all required packages from scratch...');
  
  for (const pkg of EXPECTED_PACKAGES) {
    try {
      const created = await StorefrontItem.create({
        id: pkg.id, // Explicitly set the ID
        name: pkg.name,
        description: pkg.description,
        packageType: pkg.packageType,
        sessions: pkg.sessions,
        months: pkg.months,
        sessionsPerWeek: pkg.sessionsPerWeek,
        totalSessions: pkg.totalSessions,
        pricePerSession: pkg.pricePerSession,
        price: pkg.price,
        totalCost: pkg.price,
        isActive: pkg.isActive,
        displayOrder: pkg.displayOrder
      });
      
      console.log(`   ✅ Created ID ${created.id}: ${created.name}`);
    } catch (error) {
      console.error(`   ❌ Failed to create package ${pkg.id}: ${error.message}`);
    }
  }
}

async function createMissingPackages(StorefrontItem, missingIds) {
  console.log(`🔧 Creating missing packages with IDs: ${missingIds.join(', ')}`);
  
  for (const missingId of missingIds) {
    const packageData = EXPECTED_PACKAGES.find(p => p.id === missingId);
    if (!packageData) {
      console.error(`   ❌ No template found for package ID ${missingId}`);
      continue;
    }
    
    try {
      const created = await StorefrontItem.create({
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
        displayOrder: packageData.displayOrder
      });
      
      console.log(`   ✅ Created missing package ID ${created.id}: ${created.name}`);
    } catch (error) {
      console.error(`   ❌ Failed to create missing package ${missingId}: ${error.message}`);
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixCartPackageIds()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 CART PACKAGE IDS FIXED SUCCESSFULLY!');
        console.log(`📊 Database has ${result.totalPackages} packages ready for cart operations`);
        console.log('\n🛒 Cart "Add to Cart" functionality should now work properly');
        console.log('🧪 Test by visiting the storefront and adding packages to cart');
      } else {
        console.log('\n💥 FAILED TO FIX CART PACKAGE IDS');
        console.log('❌ Error:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    });
}

export default fixCartPackageIds;
