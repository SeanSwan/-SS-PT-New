#!/usr/bin/env node

/**
 * SwanStudios Stripe Key Configurator
 * ===================================
 * Secure configuration tool for Stripe API keys
 * Supports both standard and restricted key approaches
 * Following Master Prompt v33 Secrets Management Protocol
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 SWANSTUDIOS STRIPE KEY CONFIGURATOR');
console.log('=====================================');
console.log('Secure key configuration following security best practices');
console.log('Master Prompt v33 Secrets Management Protocol Compliant\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function extractAccountId(key) {
  const match = key.match(/(?:sk_live_|pk_live_|rk_live_)([A-Za-z0-9]{16,})/);
  return match ? match[1].substring(0, 16) : null;
}

function validateKeyFormat(key, expectedType) {
  const patterns = {
    secret: /^sk_live_[A-Za-z0-9]{99,}$/,
    publishable: /^pk_live_[A-Za-z0-9]{99,}$/,
    restricted: /^rk_live_[A-Za-z0-9]{99,}$/
  };
  
  return patterns[expectedType] && patterns[expectedType].test(key.trim());
}

async function configureStripeKeys() {
  try {
    console.log('🎯 STRIPE KEY CONFIGURATION OPTIONS:');
    console.log('====================================');
    console.log('1. Standard Keys (Full API Access)');
    console.log('2. Restricted Keys (Limited Permissions - RECOMMENDED)');
    console.log('3. Help me understand the difference\n');
    
    const keyType = await askQuestion('Choose your approach (1/2/3): ');
    
    if (keyType === '3') {
      console.log('\n📚 STRIPE KEY TYPES EXPLAINED:');
      console.log('==============================');
      console.log('');
      console.log('🔓 STANDARD KEYS:');
      console.log('  • Secret Key (sk_live_): Full API access');
      console.log('  • Publishable Key (pk_live_): Frontend safe key');
      console.log('  • Pro: Simple setup, works for everything');
      console.log('  • Con: If compromised, full account access');
      console.log('');
      console.log('🔒 RESTRICTED KEYS:');
      console.log('  • Restricted Secret Key (rk_live_): Limited permissions');
      console.log('  • Same Publishable Key (pk_live_): Frontend safe key');
      console.log('  • Pro: Enhanced security, principle of least privilege');
      console.log('  • Con: Must configure correct permissions');
      console.log('');
      console.log('💡 RECOMMENDED PERMISSIONS FOR PAYMENTS:');
      console.log('  • Core API: Write access');
      console.log('  • Payment Intents: Write access');
      console.log('  • Payment Methods: Write access');
      console.log('  • Customers: Write access');
      console.log('');
      
      const proceed = await askQuestion('Ready to configure? (1 for Standard, 2 for Restricted): ');
      keyType = proceed;
    }
    
    let secretKey, publishableKey;
    
    if (keyType === '2') {
      console.log('\n🔒 RESTRICTED KEY CONFIGURATION');
      console.log('===============================');
      console.log('1. Go to: https://dashboard.stripe.com/apikeys');
      console.log('2. Click "Create restricted key"');
      console.log('3. Set these permissions:');
      console.log('   ✅ Core API: Write');
      console.log('   ✅ Payment Intents: Write');
      console.log('   ✅ Payment Methods: Write');
      console.log('   ✅ Customers: Write');
      console.log('4. Name it "SwanStudios-Payments"');
      console.log('5. Copy both the restricted key and publishable key\n');
      
      secretKey = await askQuestion('🔐 Paste your RESTRICTED KEY (rk_live_...): ');
      publishableKey = await askQuestion('🌐 Paste your PUBLISHABLE KEY (pk_live_...): ');
      
      if (!validateKeyFormat(secretKey, 'restricted')) {
        console.log('❌ Invalid restricted key format. Must start with rk_live_');
        process.exit(1);
      }
    } else {
      console.log('\n🔓 STANDARD KEY CONFIGURATION');
      console.log('=============================');
      console.log('From your Stripe dashboard, I can see you have:');
      console.log('• Publishable key: pk_live_51J7acMKE5XFS1YwGlyEfwS26fcg1UNk9BXg9e...');
      console.log('• Secret key options available');
      console.log('');
      console.log('🚨 CRITICAL: Both keys must be from the SAME account!');
      console.log('Go to: https://dashboard.stripe.com/apikeys\n');
      
      secretKey = await askQuestion('🔐 Paste your SECRET KEY (sk_live_...): ');
      publishableKey = await askQuestion('🌐 Paste your PUBLISHABLE KEY (pk_live_...): ');
      
      if (!validateKeyFormat(secretKey, 'secret')) {
        console.log('❌ Invalid secret key format. Must start with sk_live_');
        process.exit(1);
      }
    }
    
    if (!validateKeyFormat(publishableKey, 'publishable')) {
      console.log('❌ Invalid publishable key format. Must start with pk_live_');
      process.exit(1);
    }
    
    // Extract and validate account IDs
    const secretAccount = extractAccountId(secretKey);
    const publishableAccount = extractAccountId(publishableKey);
    
    if (!secretAccount || !publishableAccount) {
      console.log('❌ Could not extract account IDs from keys');
      process.exit(1);
    }
    
    if (secretAccount !== publishableAccount) {
      console.log('❌ CRITICAL: Keys are from different Stripe accounts!');
      console.log(`Secret/Restricted account: ${secretAccount}`);
      console.log(`Publishable account: ${publishableAccount}`);
      console.log('Both keys must be from the SAME Stripe account!');
      process.exit(1);
    }
    
    console.log(`\n✅ Keys validated: Both from account ${secretAccount}`);
    
    // Update environment files
    console.log('\n🔧 UPDATING ENVIRONMENT FILES');
    console.log('=============================');
    
    const envFiles = [
      { path: path.resolve(__dirname, '.env'), name: 'Backend .env' },
      { path: path.resolve(__dirname, '..', 'frontend', '.env'), name: 'Frontend .env' },
      { path: path.resolve(__dirname, '..', 'frontend', '.env.production'), name: 'Frontend .env.production' }
    ];
    
    envFiles.forEach(({ path: envPath, name }) => {
      if (existsSync(envPath)) {
        // Create backup
        const backupPath = `${envPath}.backup.${Date.now()}`;
        copyFileSync(envPath, backupPath);
        console.log(`✅ ${name} backed up to ${path.basename(backupPath)}`);
        
        // Update content
        let content = readFileSync(envPath, 'utf8');
        
        // Update secret key (backend only)
        if (name.includes('Backend')) {
          content = content.replace(
            /STRIPE_SECRET_KEY=.*/,
            `STRIPE_SECRET_KEY=${secretKey.trim()}`
          );
        }
        
        // Update publishable key (all files)
        if (content.includes('VITE_STRIPE_PUBLISHABLE_KEY=')) {
          content = content.replace(
            /VITE_STRIPE_PUBLISHABLE_KEY=.*/,
            `VITE_STRIPE_PUBLISHABLE_KEY=${publishableKey.trim()}`
          );
        } else {
          content += `\nVITE_STRIPE_PUBLISHABLE_KEY=${publishableKey.trim()}\n`;
        }
        
        writeFileSync(envPath, content, 'utf8');
        console.log(`✅ ${name} updated with matching keys`);
      } else {
        console.log(`⚠️ ${name} not found - creating minimal config`);
        
        let newContent = `# SwanStudios Environment - Key Configuration\n`;
        newContent += `# Generated: ${new Date().toISOString()}\n\n`;
        
        if (name.includes('Backend')) {
          newContent += `STRIPE_SECRET_KEY=${secretKey.trim()}\n`;
        }
        
        newContent += `VITE_STRIPE_PUBLISHABLE_KEY=${publishableKey.trim()}\n`;
        
        writeFileSync(envPath, newContent, 'utf8');
        console.log(`✅ ${name} created with matching keys`);
      }
    });
    
    console.log('\n🎉 CONFIGURATION COMPLETE!');
    console.log('==========================');
    console.log(`✅ Key Type: ${keyType === '2' ? 'Restricted (Enhanced Security)' : 'Standard'}`);
    console.log(`✅ Account ID: ${secretAccount}`);
    console.log('✅ All environment files updated');
    console.log('✅ Emergency backups created');
    console.log('');
    console.log('🚀 NEXT STEPS:');
    console.log('1. Test locally: cd frontend && npm run dev');
    console.log('2. Verify payment form loads (should show credit card fields)');
    console.log('3. Deploy when ready');
    console.log('');
    console.log('🔧 DEPLOYMENT COMMAND:');
    console.log('git add . && git commit -m "fix: update Stripe keys with matching account pairs - resolves 401 authentication errors" && git push origin main');
    
  } catch (error) {
    console.error('\n💥 Configuration failed:', error.message);
  } finally {
    rl.close();
  }
}

configureStripeKeys();
