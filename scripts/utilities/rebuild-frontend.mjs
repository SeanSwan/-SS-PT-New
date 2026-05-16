#!/usr/bin/env node

/**
 * Frontend Rebuild & Deploy Script
 * ================================
 *
 * Rebuilds the frontend with correct backend URL configuration
 * and provides deployment instructions
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('ðŸ› ï¸  Frontend Rebuild & Deploy for Production');
console.log('=============================================\n');

async function checkConfig() {
  console.log('ðŸ“‹ Step 1: Verify Configuration Files');
  console.log('=====================================\n');

  // Check .env.production
  const envProdPath = './frontend/.env.production';
  if (fs.existsSync(envProdPath)) {
    console.log('âœ… .env.production found');
    const envContent = fs.readFileSync(envProdPath, 'utf8');

    if (envContent.includes('swan-studios-api.onrender.com')) {
      console.log('âœ… .env.production has correct backend URL');
    } else {
      console.log('âŒ .env.production has wrong backend URL');
      console.log('ðŸ’¡ Fixing .env.production...');

      const correctedEnv = `# Production Environment Variables
VITE_API_URL=https://swan-studios-api.onrender.com
VITE_BACKEND_URL=https://swan-studios-api.onrender.com
VITE_NODE_ENV=production`;

      fs.writeFileSync(envProdPath, correctedEnv);
      console.log('âœ… .env.production updated');
    }
  } else {
    console.log('âŒ .env.production not found, creating...');
    const envContent = `# Production Environment Variables
VITE_API_URL=https://swan-studios-api.onrender.com
VITE_BACKEND_URL=https://swan-studios-api.onrender.com
VITE_NODE_ENV=production`;

    fs.writeFileSync(envProdPath, envContent);
    console.log('âœ… .env.production created');
  }

  // Check vite.config.js
  const viteConfigPath = './frontend/vite.config.js';
  if (fs.existsSync(viteConfigPath)) {
    console.log('âœ… vite.config.js found');
    const viteContent = fs.readFileSync(viteConfigPath, 'utf8');

    if (viteContent.includes('swan-studios-api.onrender.com')) {
      console.log('âœ… vite.config.js has correct backend URL');
    } else {
      console.log('âš ï¸  vite.config.js may need manual verification');
    }
  }

  console.log('');
}

async function buildFrontend() {
  console.log('ðŸ”¨ Step 2: Build Frontend');
  console.log('=========================\n');

  try {
    console.log('ðŸ“¦ Installing dependencies...');
    await execAsync('npm install', { cwd: './frontend' });
    console.log('âœ… Dependencies installed\n');

    console.log('ðŸ—ï¸  Building production frontend...');
    console.log('This may take a few minutes...\n');

    const { stdout, stderr } = await execAsync('npm run build', { cwd: './frontend' });

    if (stdout) {
      console.log('Build output:');
      console.log(stdout);
    }

    if (stderr && !stderr.includes('warning')) {
      console.log('Build errors:');
      console.log(stderr);
      throw new Error('Build failed');
    }

    console.log('âœ… Frontend built successfully!\n');

    // Verify build
    const distPath = './frontend/dist';
    if (fs.existsSync(distPath)) {
      console.log('âœ… dist/ folder created');

      const distFiles = fs.readdirSync(distPath);
      console.log(`ðŸ“ Built files: ${distFiles.length} items`);

      if (distFiles.includes('index.html')) {
        console.log('âœ… index.html found in build');
      }
    } else {
      throw new Error('dist/ folder not created');
    }

  } catch (error) {
    console.error('âŒ Build failed:', error.message);

    console.log('\nðŸ’¡ Troubleshooting:');
    console.log('1. Check if you\'re in the correct directory');
    console.log('2. Ensure Node.js and npm are installed');
    console.log('3. Try: cd frontend && npm install && npm run build');

    return false;
  }

  return true;
}

async function deployInstructions() {
  console.log('ðŸ“¤ Step 3: Deploy Instructions');
  console.log('==============================\n');

  console.log('Your frontend is now built with the correct backend URL!');
  console.log('The dist/ folder contains the production-ready files.\n');

  console.log('ðŸš€ DEPLOYMENT OPTIONS:\n');

  console.log('Option 1: Render Static Site');
  console.log('----------------------------');
  console.log('1. Go to Render dashboard');
  console.log('2. Find your static site service (probably sswanstudios.com)');
  console.log('3. Drag the entire frontend/dist/ folder to the deployment area');
  console.log('4. Wait for deployment to complete\n');

  console.log('Option 2: Netlify');
  console.log('-----------------');
  console.log('1. Go to Netlify dashboard');
  console.log('2. Drag frontend/dist/ folder to the deployment area');
  console.log('3. Wait for deployment\n');

  console.log('Option 3: Manual Upload');
  console.log('-----------------------');
  console.log('1. Zip the contents of frontend/dist/');
  console.log('2. Upload to your hosting provider');
  console.log('3. Extract and replace existing files\n');

  console.log('âœ… VERIFICATION AFTER DEPLOY:');
  console.log('=============================');
  console.log('1. Go to https://sswanstudios.com');
  console.log('2. Open browser dev tools (F12)');
  console.log('3. Go to Network tab');
  console.log('4. Try to login');
  console.log('5. Verify calls go to: swan-studios-api.onrender.com');
  console.log('6. Should see: POST swan-studios-api.onrender.com/api/auth/login\n');

  console.log('ðŸŽ¯ If login still fails:');
  console.log('1. Use backend npm scripts that require explicit ADMIN_PASSWORD.');
  console.log('2. Verify /api/health and /api/auth/login with real credentials.');
  console.log('3. Check browser console for errors');
}

async function main() {
  try {
    await checkConfig();

    const buildSuccess = await buildFrontend();
    if (!buildSuccess) {
      return;
    }

    await deployInstructions();

    console.log('\nðŸŽ‰ SUCCESS!');
    console.log('===========');
    console.log('Frontend rebuilt with correct backend URL!');
    console.log('Now deploy the dist/ folder and test login.');

  } catch (error) {
    console.error('âŒ Script failed:', error.message);
  }
}

// Check if we're in the right directory
if (!fs.existsSync('./frontend')) {
  console.log('âŒ Error: frontend/ directory not found');
  console.log('ðŸ’¡ Make sure you\'re running this from the project root directory');
  console.log('   Current directory should contain both frontend/ and backend/ folders');
  process.exit(1);
}

main();
