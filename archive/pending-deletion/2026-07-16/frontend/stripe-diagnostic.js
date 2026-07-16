#!/usr/bin/env node
/**
 * Stripe Configuration Diagnostic Tool
 * ====================================
 * This script helps diagnose Stripe key mismatches between frontend and backend
 * Run this to identify the 401 Unauthorized error in production
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 STRIPE CONFIGURATION DIAGNOSTIC TOOL');
console.log('==========================================\n');

// Check frontend environment variables
console.log('📱 FRONTEND CONFIGURATION:');
try {
  const envFiles = ['.env', '.env.local', '.env.production'];
  let frontendKey = null;
  
  for (const envFile of envFiles) {
    const envPath = path.join(__dirname, '..', envFile);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/VITE_STRIPE_PUBLISHABLE_KEY=(.+)/);
      if (match) {
        frontendKey = match[1].trim();
        console.log(`✅ Found in ${envFile}: ${frontendKey.substring(0, 15)}...`);
        break;
      }
    }
  }
  
  if (!frontendKey) {
    console.log('❌ No VITE_STRIPE_PUBLISHABLE_KEY found in frontend env files');
  } else {
    const isLive = frontendKey.startsWith('pk_live_');
    const isTest = frontendKey.startsWith('pk_test_');
    console.log(`📊 Frontend using: ${isLive ? 'LIVE' : isTest ? 'TEST' : 'UNKNOWN'} environment`);
  }
} catch (error) {
  console.log('❌ Error reading frontend env files:', error.message);
}

console.log('\n🖥️ BACKEND CONFIGURATION:');
try {
  const backendEnvPath = path.join(__dirname, '..', '..', 'backend', '.env');
  if (fs.existsSync(backendEnvPath)) {
    const envContent = fs.readFileSync(backendEnvPath, 'utf8');
    const secretMatch = envContent.match(/STRIPE_SECRET_KEY=(.+)/);
    const webhookMatch = envContent.match(/STRIPE_WEBHOOK_SECRET=(.+)/);
    
    if (secretMatch) {
      const secretKey = secretMatch[1].trim();
      console.log(`✅ Secret Key: ${secretKey.substring(0, 15)}...`);
      
      const isLive = secretKey.startsWith('sk_live_');
      const isTest = secretKey.startsWith('sk_test_');
      console.log(`📊 Backend using: ${isLive ? 'LIVE' : isTest ? 'TEST' : 'UNKNOWN'} environment`);
    } else {
      console.log('❌ No STRIPE_SECRET_KEY found in backend .env');
    }
    
    if (webhookMatch) {
      const webhookSecret = webhookMatch[1].trim();
      console.log(`✅ Webhook Secret: ${webhookSecret.substring(0, 15)}...`);
    } else {
      console.log('⚠️ No STRIPE_WEBHOOK_SECRET found in backend .env');
    }
  } else {
    console.log('❌ Backend .env file not found');
  }
} catch (error) {
  console.log('❌ Error reading backend env files:', error.message);
}

console.log('\n🔧 RECOMMENDATIONS:');
console.log('==================');
console.log('1. Ensure frontend and backend use matching Stripe environments (both TEST or both LIVE)');
console.log('2. Check Render environment variables match your local .env files');
console.log('3. Verify webhook endpoints are configured in Stripe dashboard');
console.log('4. Test with Stripe CLI: stripe listen --forward-to localhost:3001/api/payments/webhook');
console.log('\n🚨 If you see the 401 error, the most likely cause is:');
console.log('   Frontend using LIVE key while backend uses TEST key (or vice versa)');
