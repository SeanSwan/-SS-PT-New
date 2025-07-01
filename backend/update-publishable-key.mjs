#!/usr/bin/env node

/**
 * Quick Publishable Key Update Tool
 * ================================
 * Updates ONLY the publishable key (secret key is working fine)
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 QUICK PUBLISHABLE KEY UPDATE');
console.log('===============================');
console.log('Your secret key is working fine - just updating publishable key\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function updatePublishableKey() {
  try {
    console.log('📋 INSTRUCTIONS:');
    console.log('1. Go to: https://dashboard.stripe.com/apikeys');
    console.log('2. Make sure you\'re in your SwanStudios account');
    console.log('3. Copy the CURRENT Publishable key (pk_live_...)');
    console.log('4. Paste it below\n');
    
    const newPublishableKey = await askQuestion('🔑 Paste your CURRENT publishable key (pk_live_...): ');
    
    // Validate key
    const trimmed = newPublishableKey.trim();
    if (!trimmed.startsWith('pk_live_') || trimmed.length < 100) {
      console.log('❌ Invalid publishable key format');
      console.log('Must start with pk_live_ and be over 100 characters');
      process.exit(1);
    }
    
    console.log(`✅ Key validated: ${trimmed.length} characters`);
    
    // Update backend .env
    const backendEnvPath = path.resolve(__dirname, '.env');
    if (existsSync(backendEnvPath)) {
      const backupPath = `${backendEnvPath}.backup.${Date.now()}`;
      copyFileSync(backendEnvPath, backupPath);
      console.log(`✅ Backend backup: ${path.basename(backupPath)}`);
      
      let content = readFileSync(backendEnvPath, 'utf8');
      content = content.replace(
        /VITE_STRIPE_PUBLISHABLE_KEY=.+/,
        `VITE_STRIPE_PUBLISHABLE_KEY=${trimmed}`
      );
      writeFileSync(backendEnvPath, content, 'utf8');
      console.log('✅ Backend .env updated');
    }
    
    // Update frontend files
    const frontendFiles = [
      path.resolve(__dirname, '..', 'frontend', '.env'),
      path.resolve(__dirname, '..', 'frontend', '.env.production')
    ];
    
    frontendFiles.forEach(filePath => {
      if (existsSync(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        copyFileSync(filePath, backupPath);
        console.log(`✅ ${path.basename(filePath)} backup created`);
        
        let content = readFileSync(filePath, 'utf8');
        if (content.includes('VITE_STRIPE_PUBLISHABLE_KEY=')) {
          content = content.replace(
            /VITE_STRIPE_PUBLISHABLE_KEY=.+/,
            `VITE_STRIPE_PUBLISHABLE_KEY=${trimmed}`
          );
        } else {
          content += `\nVITE_STRIPE_PUBLISHABLE_KEY=${trimmed}\n`;
        }
        writeFileSync(filePath, content, 'utf8');
        console.log(`✅ ${path.basename(filePath)} updated`);
      }
    });
    
    console.log('\n🎉 PUBLISHABLE KEY UPDATE COMPLETE!');
    console.log('===================================');
    console.log('✅ Publishable key updated in all environment files');
    console.log('✅ Secret key left unchanged (it\'s working fine)');
    console.log('✅ Backups created for safety');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Test locally: cd frontend && npm run dev');
    console.log('2. Test payment form (401 should be gone!)');
    console.log('3. Deploy: git add . && git commit -m "fix: update Stripe publishable key" && git push origin main');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

updatePublishableKey();
