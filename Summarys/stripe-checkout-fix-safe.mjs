/**
 * Stripe Checkout Fix Script
 * 
 * This script fixes the 503 Service Unavailable error when attempting to checkout.
 * It validates your Stripe configuration and shows how to properly set it up.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Setup paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '.env');

// Load environment variables
dotenv.config({ path: envPath });

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper function to get user input
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log(`\n${colors.bright}${colors.cyan}=============================================
🛠️  STRIPE CHECKOUT FIX UTILITY
=============================================${colors.reset}\n`);

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.log(`${colors.yellow}Warning: No .env file found at ${envPath}.${colors.reset}`);
  console.log(`Creating a new .env file...\n`);

  try {
    // Create an empty .env file
    fs.writeFileSync(envPath, '# SwanStudios Environment Configuration\n\n');
    console.log(`${colors.green}✅ Created new .env file${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}❌ Failed to create .env file: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Read current .env content
let envContent = fs.readFileSync(envPath, 'utf8');

// Check for existing Stripe configuration
console.log(`\n${colors.bright}Checking current Stripe configuration:${colors.reset}`);

const stripeKeyRegex = /^STRIPE_SECRET_KEY=(.*)$/m;
const stripeWebhookRegex = /^STRIPE_WEBHOOK_SECRET=(.*)$/m;

const hasStripeKey = stripeKeyRegex.test(envContent);
const hasWebhookSecret = stripeWebhookRegex.test(envContent);

if (hasStripeKey) {
  const match = envContent.match(stripeKeyRegex);
  const key = match[1];
  if (key && (key.startsWith('sk_test_') || key.startsWith('sk_live_'))) {
    console.log(`${colors.green}✅ STRIPE_SECRET_KEY found with valid format${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ STRIPE_SECRET_KEY found but has invalid format${colors.reset}`);
  }
} else {
  console.log(`${colors.red}❌ STRIPE_SECRET_KEY not found${colors.reset}`);
}

if (hasWebhookSecret) {
  console.log(`${colors.green}✅ STRIPE_WEBHOOK_SECRET found${colors.reset}`);
} else {
  console.log(`${colors.yellow}⚠️ STRIPE_WEBHOOK_SECRET not found (optional for testing)${colors.reset}`);
}

// Check for frontend URL configuration
const frontendUrlRegex = /^FRONTEND_URL=(.*)$/m;
const viteBackendUrlRegex = /^VITE_BACKEND_URL=(.*)$/m;

const hasFrontendUrl = frontendUrlRegex.test(envContent);
const hasViteBackendUrl = viteBackendUrlRegex.test(envContent);

console.log(`\n${colors.bright}Checking frontend URL configuration:${colors.reset}`);
if (hasFrontendUrl) {
  console.log(`${colors.green}✅ FRONTEND_URL found${colors.reset}`);
} else if (hasViteBackendUrl) {
  console.log(`${colors.green}✅ VITE_BACKEND_URL found (can be used instead of FRONTEND_URL)${colors.reset}`);
} else {
  console.log(`${colors.yellow}⚠️ No frontend URL configured. Will use default http://localhost:5173${colors.reset}`);
}

// Main function
async function main() {
  console.log(`\n${colors.bright}${colors.cyan}=============================================
💳  STRIPE CONFIGURATION SETUP 
=============================================${colors.reset}\n`);
  
  console.log(`${colors.bright}To fix the "Payment service unavailable" error, you need to configure your Stripe API keys.${colors.reset}\n`);
  
  console.log(`Would you like to:
1. Add test Stripe keys (for development)
2. Add your own Stripe keys (for production)
3. Exit without making changes\n`);
  
  const choice = await question('Choose an option (1-3): ');
  
  if (choice === '1') {
    // Add test keys
    console.log(`\n${colors.bright}Adding Stripe test keys for development...${colors.reset}`);
    
    console.log(`\n${colors.yellow}You'll need to get test keys from your Stripe Dashboard.${colors.reset}`);
    const stripeTestKey = await question('Enter your Stripe test key (starts with sk_test_): ');
    
    if (!stripeTestKey.startsWith('sk_test_')) {
      console.log(`\n${colors.red}Invalid test key format. It should start with 'sk_test_'.${colors.reset}`);
      rl.close();
      return;
    }
    
    // Replace or add the Stripe secret key
    if (hasStripeKey) {
      envContent = envContent.replace(stripeKeyRegex, `STRIPE_SECRET_KEY=${stripeTestKey}`);
    } else {
      envContent += `\n# Stripe Configuration\nSTRIPE_SECRET_KEY=${stripeTestKey}\n`;
    }
    
    // Replace or add the Stripe webhook secret
    const webhookSecret = await question('Enter your Stripe webhook secret (or leave empty): ');
    if (webhookSecret) {
      if (hasWebhookSecret) {
        envContent = envContent.replace(stripeWebhookRegex, `STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
      } else {
        envContent += `STRIPE_WEBHOOK_SECRET=${webhookSecret}\n`;
      }
    } else if (!hasWebhookSecret) {
      envContent += `STRIPE_WEBHOOK_SECRET=whsec_test_mock_secret_for_development\n`;
    }
    
    // Save the updated .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log(`\n${colors.green}✅ Test Stripe configuration added to .env file${colors.reset}`);
    console.log(`\n${colors.yellow}Note: These are development-only test keys and will not process real payments.${colors.reset}`);
  } 
  else if (choice === '2') {
    // Add user's own keys
    console.log(`\n${colors.bright}Please enter your Stripe API credentials:${colors.reset}`);
    console.log(`${colors.yellow}(You can find these in your Stripe Dashboard)${colors.reset}\n`);
    
    const stripeSecretKey = await question('Stripe Secret Key (starts with sk_): ');
    const stripeWebhookSecret = await question('Stripe Webhook Secret (optional, starts with whsec_): ');
    
    // Validate the Stripe key format
    if (!stripeSecretKey.startsWith('sk_')) {
      console.log(`\n${colors.red}Warning: The key you entered doesn't start with 'sk_'. This may not be a valid Stripe secret key.${colors.reset}`);
      const confirm = await question('Continue anyway? (y/n): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('Aborting...');
        rl.close();
        return;
      }
    }
    
    // Replace or add the Stripe secret key
    if (hasStripeKey) {
      envContent = envContent.replace(stripeKeyRegex, `STRIPE_SECRET_KEY=${stripeSecretKey}`);
    } else {
      envContent += `\n# Stripe Configuration\nSTRIPE_SECRET_KEY=${stripeSecretKey}\n`;
    }
    
    // Replace or add the Stripe webhook secret if provided
    if (stripeWebhookSecret) {
      if (hasWebhookSecret) {
        envContent = envContent.replace(stripeWebhookRegex, `STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret}`);
      } else {
        envContent += `STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret}\n`;
      }
    }
    
    // Save the updated .env file
    fs.writeFileSync(envPath, envContent);
    
    console.log(`\n${colors.green}✅ Stripe configuration added to .env file${colors.reset}`);
  }
  else {
    console.log(`\n${colors.yellow}No changes made to your configuration.${colors.reset}`);
  }
  
  // Configure frontend URL if missing
  if (!hasFrontendUrl && !hasViteBackendUrl) {
    console.log(`\n${colors.bright}Frontend URL Configuration:${colors.reset}`);
    console.log(`This URL is used for redirect after checkout.\n`);
    
    const setupUrl = await question('Would you like to configure the frontend URL? (y/n): ');
    
    if (setupUrl.toLowerCase() === 'y') {
      const frontendUrl = await question('Enter your frontend URL (default: http://localhost:5173): ');
      const urlToUse = frontendUrl || 'http://localhost:5173';
      
      // Add frontend URL to .env
      envContent += `\n# Frontend URL for redirects\nFRONTEND_URL=${urlToUse}\n`;
      
      // Save the updated .env file
      fs.writeFileSync(envPath, envContent);
      
      console.log(`\n${colors.green}✅ Frontend URL configured: ${urlToUse}${colors.reset}`);
    }
  }
  
  // Add backend fix instructions
  console.log(`\n${colors.bright}${colors.cyan}=============================================
📝  NEXT STEPS
=============================================${colors.reset}\n`);
  
  console.log(`${colors.bright}1. Restart your server to apply the changes:${colors.reset}`);
  console.log(`   npm run dev`);
  
  console.log(`\n${colors.bright}2. Test the checkout flow:${colors.reset}`);
  console.log(`   - Add items to cart`);
  console.log(`   - Click checkout`);
  console.log(`   - You should be redirected to Stripe's checkout page`);
  
  console.log(`\n${colors.bright}${colors.yellow}Test Card Details for Stripe:${colors.reset}`);
  console.log(`   Card number: 4242 4242 4242 4242`);
  console.log(`   Expiry: Any future date (e.g., 12/29)`);
  console.log(`   CVC: Any 3 digits`);
  console.log(`   ZIP: Any 5 digits`);
  
  console.log(`\n${colors.bright}${colors.green}=============================================
✅  FIX COMPLETED
==============================================${colors.reset}\n`);
  
  rl.close();
}

// Run the main function
main().catch(err => {
  console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
  rl.close();
});
