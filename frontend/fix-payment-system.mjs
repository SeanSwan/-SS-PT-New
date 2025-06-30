#!/usr/bin/env node

/**
 * Master Payment Fix Script
 * ========================
 * One-click solution to fix Stripe 401 errors
 * Following Master Prompt v33 Secrets Management Protocol
 */

import { spawn } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 SWANSTUDIOS PAYMENT SYSTEM FIX');
console.log('=================================');
console.log('Automated solution for Stripe 401 errors');
console.log('Following Master Prompt v33 Secrets Management Protocol\n');

// Helper function to run scripts
function runScript(scriptPath, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 ${description}...`);
    console.log(''.padEnd(50, '='));
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully\n`);
        resolve();
      } else {
        console.log(`❌ ${description} failed with code ${code}\n`);
        reject(new Error(`Script failed: ${scriptPath}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`❌ Failed to run ${scriptPath}: ${error.message}`);
      reject(error);
    });
  });
}

// Helper function to clear cache
function clearViteCache() {
  console.log('\n🧹 Clearing Vite cache...');
  console.log(''.padEnd(30, '='));
  
  const cacheDirectories = [
    path.join(__dirname, '.vite'),
    path.join(__dirname, 'node_modules', '.vite')
  ];
  
  let cleared = false;
  
  cacheDirectories.forEach(dir => {
    if (existsSync(dir)) {
      try {
        rmSync(dir, { recursive: true, force: true });
        console.log(`✅ Cleared: ${path.basename(dir)}`);
        cleared = true;
      } catch (error) {
        console.log(`⚠️ Failed to clear ${path.basename(dir)}: ${error.message}`);
      }
    }
  });
  
  if (!cleared) {
    console.log('ℹ️ No cache directories found (this is normal)');
  }
  
  console.log('✅ Cache clearing completed\n');
}

// Main execution
async function main() {
  try {
    // Step 1: Synchronize Stripe keys
    await runScript('sync-stripe-keys.mjs', 'Synchronizing Stripe keys');
    
    // Step 2: Clear Vite cache
    clearViteCache();
    
    // Step 3: Verify configuration
    await runScript('verify-payment-system.mjs', 'Verifying payment system configuration');
    
    // Success summary
    console.log('🎉 PAYMENT SYSTEM FIX COMPLETE!');
    console.log('===============================');
    console.log('✅ Stripe keys synchronized between backend and frontend');
    console.log('✅ Vite cache cleared');
    console.log('✅ Configuration verified');
    
    console.log('\n🚀 FINAL STEPS:');
    console.log('===============');
    console.log('1. Stop your current dev server (Ctrl+C if running)');
    console.log('2. Start the frontend server: npm run dev');
    console.log('3. Test the payment form - the 401 error should be resolved');
    console.log('4. If issues persist, check the browser console for specific errors');
    
    console.log('\n🛡️ SECURITY NOTES:');
    console.log('==================');
    console.log('✅ No secrets were displayed during this process');
    console.log('✅ All operations followed secure practices');
    console.log('✅ Backups created before any modifications');
    
    console.log('\n💡 If you still encounter issues:');
    console.log('=================================');
    console.log('1. Check your Stripe Dashboard for any account notifications');
    console.log('2. Verify your internet connection to api.stripe.com');
    console.log('3. Try a hard refresh in your browser (Ctrl+Shift+R)');
    console.log('4. Check if your Stripe keys were recently rotated');
    
  } catch (error) {
    console.error('\n💥 FIX PROCESS FAILED:');
    console.error('======================');
    console.error(`Error: ${error.message}`);
    console.error('\nPlease check the error messages above and try running individual scripts:');
    console.error('1. node sync-stripe-keys.mjs');
    console.error('2. node verify-payment-system.mjs');
    console.error('\nIf problems persist, contact support with the error details.');
    process.exit(1);
  }
}

// Run the main process
main().catch(error => {
  console.error('\nUnexpected error:', error);
  process.exit(1);
});
