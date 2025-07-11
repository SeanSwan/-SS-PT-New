/**
 * Diagnose Checkout 500 Error
 * ==========================
 * 
 * Quick diagnostic script to check what's causing the checkout 500 error
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '.env');

console.log('🔍 Loading environment from:', envPath);
dotenv.config({ path: envPath });

console.log('\n🔧 ENVIRONMENT DIAGNOSTICS:');
console.log('============================');

// Check critical environment variables
const criticalEnvVars = [
  'NODE_ENV',
  'DATABASE_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'JWT_SECRET',
  'VITE_FRONTEND_URL'
];

let missingVars = [];
let hasIssues = false;

criticalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: MISSING`);
    missingVars.push(varName);
    hasIssues = true;
  } else {
    // Mask sensitive values
    if (varName.includes('SECRET') || varName.includes('KEY')) {
      console.log(`✅ ${varName}: ${value.substring(0, 8)}...${value.substring(value.length - 4)} (${value.length} chars)`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  }
});

console.log('\n💳 STRIPE CONFIGURATION:');
console.log('========================');

if (process.env.STRIPE_SECRET_KEY) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  
  if (stripeKey.startsWith('sk_test_')) {
    console.log('🧪 Using Stripe TEST mode');
  } else if (stripeKey.startsWith('sk_live_')) {
    console.log('🎯 Using Stripe LIVE mode');
  } else {
    console.log('❌ Invalid Stripe secret key format');
    hasIssues = true;
  }
  
  // Test Stripe initialization
  try {
    const { default: Stripe } = await import('stripe');
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
    console.log('✅ Stripe client initialized successfully');
    
    // Test Stripe API connectivity
    try {
      const account = await stripe.accounts.retrieve();
      console.log(`✅ Stripe account connected: ${account.id}`);
      console.log(`   - Email: ${account.email || 'Not set'}`);
      console.log(`   - Country: ${account.country || 'Not set'}`);
      console.log(`   - Charges enabled: ${account.charges_enabled || false}`);
      console.log(`   - Payouts enabled: ${account.payouts_enabled || false}`);
    } catch (stripeError) {
      console.log('❌ Stripe API test failed:', stripeError.message);
      hasIssues = true;
    }
  } catch (importError) {
    console.log('❌ Failed to import Stripe:', importError.message);
    hasIssues = true;
  }
} else {
  console.log('❌ STRIPE_SECRET_KEY not found');
  hasIssues = true;
}

console.log('\n🗄️ DATABASE CONNECTION:');
console.log('=======================');

if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL is set');
  
  // Test database connection
  try {
    const { Sequelize } = await import('sequelize');
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
    
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    await sequelize.close();
  } catch (dbError) {
    console.log('❌ Database connection failed:', dbError.message);
    hasIssues = true;
  }
} else {
  console.log('❌ DATABASE_URL not found');
  hasIssues = true;
}

console.log('\n📋 SUMMARY:');
console.log('===========');

if (hasIssues) {
  console.log('❌ Issues found that could cause checkout failures:');
  if (missingVars.length > 0) {
    console.log(`   - Missing environment variables: ${missingVars.join(', ')}`);
  }
  console.log('\n🔧 RECOMMENDED ACTIONS:');
  console.log('1. Check Render environment variables');
  console.log('2. Verify Stripe account configuration');
  console.log('3. Test database connectivity');
  console.log('4. Check backend logs during checkout attempt');
} else {
  console.log('✅ All critical systems appear to be configured correctly');
  console.log('💡 The 500 error might be due to:');
  console.log('   - Specific Stripe API call failing');
  console.log('   - Cart/User data validation issues');
  console.log('   - Business logic errors in checkout flow');
  console.log('\n🔧 Next step: Check backend logs during checkout attempt');
}

console.log('\n🏁 Diagnostic complete');
process.exit(hasIssues ? 1 : 0);
