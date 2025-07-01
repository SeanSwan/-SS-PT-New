#!/usr/bin/env node

/**
 * Stripe Account Decision Helper
 * ============================
 * Helps identify which Stripe account should be the primary one
 * Following Master Prompt v33 Secrets Management Protocol
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '.env');
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

console.log('🤔 STRIPE ACCOUNT DECISION HELPER');
console.log('=================================');
console.log('Determining which Stripe account should be your primary account\n');

async function analyzeAccounts() {
  try {
    const Stripe = await import('stripe');
    
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!secretKey || !publishableKey) {
      console.log('❌ Missing Stripe keys');
      return;
    }
    
    // Extract account info safely
    const secretMatch = secretKey.match(/sk_(live|test)_([A-Za-z0-9]+)/);
    const publishableMatch = publishableKey.match(/pk_(live|test)_([A-Za-z0-9]+)/);
    
    if (!secretMatch || !publishableMatch) {
      console.log('❌ Invalid key formats');
      return;
    }
    
    const secretAccountId = secretMatch[2];
    const publishableAccountId = publishableMatch[2];
    
    console.log('📊 ACCOUNT ANALYSIS:');
    console.log('====================');
    
    // Test SECRET KEY account
    console.log('\n🔐 SECRET KEY ACCOUNT INFO:');
    console.log('---------------------------');
    try {
      const stripe1 = new Stripe.default(secretKey, { apiVersion: '2023-10-16' });
      const account1 = await stripe1.accounts.retrieve();
      
      console.log(`✅ Account ID: ${account1.id}`);
      console.log(`🏢 Business Name: ${account1.business_profile?.name || 'Not set'}`);
      console.log(`📧 Email: ${account1.email || 'Not set'}`);
      console.log(`🌍 Country: ${account1.country}`);
      console.log(`💰 Charges Enabled: ${account1.charges_enabled ? '✅ YES' : '❌ NO'}`);
      console.log(`💳 Payouts Enabled: ${account1.payouts_enabled ? '✅ YES' : '❌ NO'}`);
      console.log(`🏦 Bank Account Connected: ${account1.external_accounts?.total_count > 0 ? '✅ YES' : '❌ NO'}`);
      console.log(`📄 Details Submitted: ${account1.details_submitted ? '✅ YES' : '❌ NO'}`);
      
      // Get some recent charges to see activity
      try {
        const charges = await stripe1.charges.list({ limit: 5 });
        console.log(`💼 Recent Activity: ${charges.data.length > 0 ? `${charges.data.length} recent charges` : 'No recent charges'}`);
        
        if (charges.data.length > 0) {
          const totalAmount = charges.data.reduce((sum, charge) => sum + charge.amount, 0);
          console.log(`💰 Recent Volume: $${(totalAmount / 100).toFixed(2)}`);
        }
      } catch (err) {
        console.log(`💼 Recent Activity: Could not fetch (${err.message})`);
      }
      
    } catch (error) {
      console.log(`❌ SECRET KEY ERROR: ${error.message}`);
      if (error.type === 'StripeAuthenticationError') {
        console.log('🚨 This secret key is INVALID or REVOKED!');
      }
    }
    
    // Test PUBLISHABLE KEY by attempting to find matching secret key info
    console.log('\n🌐 PUBLISHABLE KEY ACCOUNT INFO:');
    console.log('-------------------------------');
    console.log(`📊 Account ID: ${publishableAccountId}`);
    console.log('ℹ️ Cannot retrieve detailed info with publishable key only');
    console.log('ℹ️ You will need to check this account in your Stripe Dashboard');
    
    // Recommendations
    console.log('\n🎯 DECISION FRAMEWORK:');
    console.log('======================');
    console.log('Choose the account that has:');
    console.log('✅ Your business information (name, email, address)');
    console.log('✅ Bank account connected for payouts');
    console.log('✅ Payment history/transaction data');
    console.log('✅ Customer data and subscriptions');
    console.log('✅ Proper business verification completed');
    console.log('✅ The account you actively manage');
    
    console.log('\n🔍 HOW TO CHECK BOTH ACCOUNTS:');
    console.log('==============================');
    console.log('1. Open https://dashboard.stripe.com');
    console.log('2. Check which account is currently logged in');
    console.log('3. Look at the account switcher (top-left) to see all your accounts');
    console.log('4. Compare:');
    console.log('   - Business profiles');
    console.log('   - Connected bank accounts');
    console.log('   - Payment/customer history');
    console.log('   - Verification status');
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('==============');
    console.log('1. Decide which Stripe account should be your primary account');
    console.log('2. Get BOTH the secret and publishable keys from that SAME account');
    console.log('3. Update your environment variables with the matching pair');
    console.log('4. Run the fix script again');
    
    console.log('\n⚠️ IMPORTANT SECURITY NOTE:');
    console.log('===========================');
    console.log('🔐 When copying keys from Stripe Dashboard:');
    console.log('   - Copy the ENTIRE key (they are long!)');
    console.log('   - Do not include extra spaces or line breaks');
    console.log('   - Use the "Reveal" button to see the full key');
    console.log('   - Copy both keys from the SAME account');
    
  } catch (error) {
    console.error('\n💥 ANALYSIS ERROR:', error.message);
  }
}

analyzeAccounts();
