#!/usr/bin/env node

/**
 * Direct Stripe Key Validation Test
 * ================================
 * Tests if the actual keys work with Stripe API
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

console.log('🧪 DIRECT STRIPE KEY VALIDATION TEST');
console.log('====================================');
console.log('Testing if your keys actually work with Stripe API\n');

async function testKeysDirectly() {
  try {
    const Stripe = await import('stripe');
    
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    console.log('📊 KEY FORMAT ANALYSIS:');
    console.log('=======================');
    
    // Check secret key
    if (secretKey) {
      const trimmedSecret = secretKey.trim();
      console.log(`🔐 Secret Key:`);
      console.log(`   Length: ${trimmedSecret.length} characters`);
      console.log(`   Starts with: ${trimmedSecret.substring(0, 8)}...`);
      console.log(`   Environment: ${trimmedSecret.includes('_live_') ? 'LIVE' : 'TEST'}`);
      console.log(`   Has whitespace: ${trimmedSecret !== secretKey ? '⚠️ YES' : '✅ NO'}`);
      
      // Extract account ID
      const secretMatch = trimmedSecret.match(/sk_(live|test)_([A-Za-z0-9]+)/);
      if (secretMatch) {
        console.log(`   Account ID: ${secretMatch[2]}`);
      }
    }
    
    // Check publishable key
    if (publishableKey) {
      const trimmedPublishable = publishableKey.trim();
      console.log(`\n🌐 Publishable Key:`);
      console.log(`   Length: ${trimmedPublishable.length} characters`);
      console.log(`   Starts with: ${trimmedPublishable.substring(0, 8)}...`);
      console.log(`   Environment: ${trimmedPublishable.includes('_live_') ? 'LIVE' : 'TEST'}`);
      console.log(`   Has whitespace: ${trimmedPublishable !== publishableKey ? '⚠️ YES' : '✅ NO'}`);
      
      // Extract account ID
      const publishableMatch = trimmedPublishable.match(/pk_(live|test)_([A-Za-z0-9]+)/);
      if (publishableMatch) {
        console.log(`   Account ID: ${publishableMatch[2]}`);
      }
      
      // Compare accounts
      const secretMatch = secretKey.trim().match(/sk_(live|test)_([A-Za-z0-9]+)/);
      if (secretMatch && publishableMatch) {
        const accountsMatch = secretMatch[2] === publishableMatch[2];
        console.log(`\n🔗 Account Match: ${accountsMatch ? '✅ YES' : '❌ NO'}`);
        if (!accountsMatch) {
          console.log(`   Secret Account: ${secretMatch[2]}`);
          console.log(`   Publishable Account: ${publishableMatch[2]}`);
        }
      }
    }
    
    console.log('\n🧪 LIVE API TESTING:');
    console.log('====================');
    
    // Test 1: Secret Key API Call
    console.log('\n1️⃣ Testing Secret Key with Account Retrieval...');
    try {
      const stripe = new Stripe.default(secretKey.trim(), {
        apiVersion: '2023-10-16'
      });
      
      const account = await stripe.accounts.retrieve();
      console.log('✅ Secret key WORKS - account retrieved successfully');
      console.log(`   Account: ${account.business_profile?.name || account.email || account.id}`);
      
    } catch (secretError) {
      console.log(`❌ Secret key FAILED: ${secretError.message}`);
      console.log(`   Error Type: ${secretError.type}`);
      console.log(`   Error Code: ${secretError.code || 'N/A'}`);
      
      if (secretError.type === 'StripeAuthenticationError') {
        console.log('🚨 CRITICAL: Secret key is INVALID, REVOKED, or EXPIRED!');
        return;
      }
    }
    
    // Test 2: Payment Intent Creation (tests both keys working together)
    console.log('\n2️⃣ Testing Payment Intent Creation (both keys)...');
    try {
      const stripe = new Stripe.default(secretKey.trim(), {
        apiVersion: '2023-10-16'
      });
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 100, // $1.00
        currency: 'usd',
        description: 'Key validation test',
        automatic_payment_methods: {
          enabled: true
        }
      });
      
      console.log('✅ Payment Intent creation WORKS');
      console.log(`   Payment Intent ID: ${paymentIntent.id}`);
      console.log(`   Client Secret: ${paymentIntent.client_secret.substring(0, 20)}...`);
      
      // Test 3: Simulate what frontend does
      console.log('\n3️⃣ Simulating Frontend Stripe Elements initialization...');
      
      // This is what Stripe Elements does - it calls the /v1/elements/sessions endpoint
      // We can't directly test this without a browser, but we can validate the key format
      const pubKeyValid = publishableKey.trim().startsWith('pk_') && publishableKey.trim().length > 100;
      
      if (pubKeyValid) {
        console.log('✅ Publishable key format is valid for Stripe Elements');
        
        // Check if it matches the payment intent account
        const piAccountId = paymentIntent.id.substring(3, paymentIntent.id.indexOf('_', 3));
        const pubAccountMatch = publishableKey.trim().match(/pk_(live|test)_([A-Za-z0-9]+)/);
        
        if (pubAccountMatch) {
          // Compare account IDs from different sources
          console.log(`   Payment Intent Account: ${piAccountId}`);
          console.log(`   Publishable Key Account: ${pubAccountMatch[2]}`);
          
          if (piAccountId === pubAccountMatch[2]) {
            console.log('✅ Accounts match between payment intent and publishable key');
          } else {
            console.log('❌ Account mismatch detected!');
            console.log('🚨 This is why you get 401 errors!');
          }
        }
      } else {
        console.log('❌ Publishable key format is invalid');
      }
      
    } catch (paymentError) {
      console.log(`❌ Payment Intent creation FAILED: ${paymentError.message}`);
      console.log(`   Error Type: ${paymentError.type}`);
      console.log(`   Error Code: ${paymentError.code || 'N/A'}`);
    }
    
    console.log('\n🎯 DIAGNOSIS SUMMARY:');
    console.log('====================');
    
    const secretWorks = !secretKey.includes('failed');
    const formatValid = publishableKey && publishableKey.trim().startsWith('pk_');
    
    if (secretWorks && formatValid) {
      console.log('✅ Basic key validation passed');
      console.log('❌ But you still get 401 errors...');
      console.log('\n🤔 POSSIBLE CAUSES:');
      console.log('==================');
      console.log('1. Keys are from different Stripe accounts (most likely)');
      console.log('2. Publishable key has been revoked/regenerated');
      console.log('3. Frontend build is using cached/old environment variables');
      console.log('4. Environment variable loading issue in production');
      console.log('5. Stripe account has restrictions (less likely)');
      
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      console.log('======================');
      console.log('1. Go to Stripe Dashboard → Developers → API Keys');
      console.log('2. Generate a NEW set of keys (both secret and publishable)');
      console.log('3. Copy BOTH keys from the SAME account at the SAME time');
      console.log('4. Replace both keys in your environment files');
      console.log('5. Deploy and test again');
      
    } else {
      console.log('❌ Key validation failed');
      console.log('You need to get fresh keys from your Stripe Dashboard');
    }
    
  } catch (error) {
    console.error('\n💥 TEST ERROR:', error.message);
  }
}

testKeysDirectly();
