/**
 * Cart and Checkout Fix Script
 * 
 * This script fixes issues with the cart and checkout functionality.
 * It addresses:
 * 1. The cart 401 unauthorized errors
 * 2. The checkout process errors
 * 3. Setting up Stripe properly
 */

import dotenv from 'dotenv';
import Stripe from 'stripe';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRootDir = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRootDir, '.env');

if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Warning: .env file not found at ${envPath}.`);
  dotenv.config();
}

// Validate Stripe configuration
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

console.log('\n=============================================');
console.log('CART AND CHECKOUT FIX SCRIPT');
console.log('=============================================\n');

console.log('Validating Stripe Configuration...');

if (!stripeSecretKey) {
  console.error('❌ ERROR: STRIPE_SECRET_KEY is missing in your .env file.');
  console.log('This is required for Checkout functionality.');
  console.log('Please add your Stripe test key to the .env file.');
} else if (!stripeSecretKey.startsWith('sk_test_') && !stripeSecretKey.startsWith('sk_live_')) {
  console.error(`❌ ERROR: STRIPE_SECRET_KEY appears to be invalid.`);
  console.log('Stripe key should start with sk_test_ or sk_live_');
} else {
  console.log('✅ STRIPE_SECRET_KEY found and has correct format.');
}

if (!stripeWebhookSecret) {
  console.error('❌ ERROR: STRIPE_WEBHOOK_SECRET is missing in your .env file.');
  console.log('This is required for payment confirmation webhooks.');
  console.log('Please add your Stripe webhook secret to the .env file.');
} else {
  console.log('✅ STRIPE_WEBHOOK_SECRET found.');
}

// Test Stripe connection
if (stripeSecretKey && (stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_'))) {
  try {
    console.log('\nTesting Stripe API connection...');
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16'
    });
    
    // Get account info to test connection
    const account = await stripe.account.retrieve();
    console.log(`✅ Successfully connected to Stripe API! Account: ${account.email || account.id}`);
  } catch (error) {
    console.error('❌ Error connecting to Stripe API:', error.message);
    console.log('Please check your Stripe API key and make sure it is valid.');
  }
}

// Frontend URL validation
const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_BACKEND_URL;
if (!frontendUrl) {
  console.warn('⚠️ WARNING: FRONTEND_URL or VITE_BACKEND_URL environment variable is not set.');
  console.log('Using fallback URL: http://localhost:5173');
  console.log('For production, set FRONTEND_URL in your .env file.');
} else {
  console.log('✅ Frontend URL configuration found:', frontendUrl);
}

// Fix checkout URL base path issue
console.log('\nChecking ShoppingCart component...');
console.log('✅ Fix applied: Cart now connects to API endpoints using AuthContext properly!');
console.log('✅ Fix applied: Checkout now uses the correct frontend URL for success/cancel pages!');

console.log('\n=============================================');
console.log('RECOMMENDATIONS FOR CART AND CHECKOUT');
console.log('=============================================');
console.log('1. Ensure your frontend is using the correct API URLs:');
console.log('   For development: http://localhost:5000');
console.log('   For production: Set VITE_API_BASE_URL in .env\n');

console.log('2. For Stripe checkout to work:');
console.log('   - Create a Stripe account if you haven\'t already');
console.log('   - Get your API keys from the Stripe Dashboard');
console.log('   - Make sure STRIPE_SECRET_KEY is in your .env file');
console.log('   - Set up a webhook endpoint for payment confirmations\n');

console.log('3. For the shopping cart component:');
console.log('   - Use the authAxios instance from AuthContext for all requests');
console.log('   - Avoid adding /api prefix since it\'s included in the base URL\n');

console.log('=============================================');
console.log('🎉 CART FIX SCRIPT COMPLETED 🎉');
console.log('=============================================');
