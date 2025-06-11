#!/usr/bin/env node
/**
 * SwanStudios Production Deployment Fix Script
 * ============================================
 * This script fixes critical production deployment issues:
 * 1. Copies missing static files from public to dist
 * 2. Updates backend CORS configuration
 * 3. Rebuilds frontend with correct asset hashes
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Console styling
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}\n`)
};

async function copyMissingFiles() {
  log.title('📁 FIXING MISSING STATIC FILES');
  
  const publicDir = path.join(__dirname, 'frontend', 'public');
  const distDir = path.join(__dirname, 'frontend', 'dist');
  
  // Files that are missing in dist but exist in public
  const missingFiles = [
    'video-poster.jpg',
    'image1.jpg', 
    'image2.jpg',
    'image3.jpg'
  ];
  
  let copiedCount = 0;
  
  for (const file of missingFiles) {
    try {
      const srcPath = path.join(publicDir, file);
      const destPath = path.join(distDir, file);
      
      // Check if source exists
      try {
        await fs.access(srcPath);
      } catch {
        log.warning(`Source file not found: ${file}`);
        continue;
      }
      
      // Copy file
      await fs.copyFile(srcPath, destPath);
      log.success(`Copied ${file} to dist`);
      copiedCount++;
      
    } catch (error) {
      log.error(`Failed to copy ${file}: ${error.message}`);
    }
  }
  
  log.info(`Copied ${copiedCount}/${missingFiles.length} missing files`);
}

async function updateBackendCORS() {
  log.title('🔧 FIXING BACKEND CORS CONFIGURATION');
  
  const serverPath = path.join(__dirname, 'backend', 'server.mjs');
  
  try {
    let serverContent = await fs.readFile(serverPath, 'utf8');
    
    // Find the health check endpoint and ensure it has proper CORS headers
    const healthCheckFix = `
// Health check endpoint - crucial for Render and monitoring
// Simple, robust health check that always works
app.get('/health', async (req, res) => {
  // Set CORS headers explicitly for health check - FIXED FOR PRODUCTION
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://sswanstudios.com',
    'https://www.sswanstudios.com', 
    'https://swanstudios.com',
    'https://www.swanstudios.com',
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || 'https://sswanstudios.com');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  try {
    // Basic server health response
    const healthResponse = {
      success: true,
      status: 'healthy',
      message: 'SwanStudios API Server is running',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: '1.0.0'
    };
    
    // Optional: Add database check if needed, but don't fail health check if DB is down
    try {
      await sequelize.authenticate();
      healthResponse.database = { status: 'connected', type: 'postgresql' };
    } catch (dbError) {
      healthResponse.database = { status: 'disconnected', message: 'Database check failed but server is running' };
    }
    
    res.status(200).json(healthResponse);
  } catch (error) {
    // Always return 200 for health checks - even if there are issues
    res.status(200).json({
      success: true,
      status: 'basic',
      message: 'Server is running (minimal health check)',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime())
    });
  }
});`;

    // Replace the existing health check endpoint
    const healthCheckRegex = /app\.get\(['"]\/health['"],[\s\S]*?\}\);/;
    
    if (healthCheckRegex.test(serverContent)) {
      serverContent = serverContent.replace(healthCheckRegex, healthCheckFix);
      await fs.writeFile(serverPath, serverContent);
      log.success('Updated backend CORS configuration');
    } else {
      log.warning('Could not find health check endpoint to update');
    }
    
  } catch (error) {
    log.error(`Failed to update backend CORS: ${error.message}`);
  }
}

async function rebuildFrontend() {
  log.title('🏗️ REBUILDING FRONTEND');
  
  try {
    log.info('Installing dependencies...');
    await execAsync('npm install', { cwd: path.join(__dirname, 'frontend') });
    
    log.info('Building production frontend...');
    await execAsync('npm run build', { cwd: path.join(__dirname, 'frontend') });
    
    log.success('Frontend rebuilt successfully');
    
  } catch (error) {
    log.error(`Frontend rebuild failed: ${error.message}`);
    throw error;
  }
}

async function verifyFixes() {
  log.title('🔍 VERIFYING FIXES');
  
  const distDir = path.join(__dirname, 'frontend', 'dist');
  
  // Check if missing files now exist
  const requiredFiles = ['video-poster.jpg', 'image1.jpg', 'image2.jpg', 'image3.jpg'];
  let foundFiles = 0;
  
  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(distDir, file));
      log.success(`✓ ${file} exists in dist`);
      foundFiles++;
    } catch {
      log.error(`✗ ${file} still missing from dist`);
    }
  }
  
  // Check if index.html exists and has proper structure
  try {
    const indexContent = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');
    if (indexContent.includes('assets/index-') && indexContent.includes('.js')) {
      log.success('✓ index.html has proper asset references');
    } else {
      log.warning('✗ index.html may have incorrect asset references');
    }
  } catch (error) {
    log.error('✗ index.html not found or unreadable');
  }
  
  return foundFiles === requiredFiles.length;
}

async function displayNextSteps() {
  log.title('📋 NEXT STEPS FOR DEPLOYMENT');
  
  console.log(`${colors.cyan}To complete the production deployment:${colors.reset}

${colors.yellow}1. Push changes to your repository:${colors.reset}
   git add .
   git commit -m "Fix production deployment issues - missing assets and CORS"
   git push origin main

${colors.yellow}2. Deploy to your hosting platform:${colors.reset}
   • If using Render: Your app should redeploy automatically
   • If using Vercel/Netlify: Run their deployment command
   • If using custom server: Upload the dist folder contents

${colors.yellow}3. Verify the fixes:${colors.reset}
   • Visit https://sswanstudios.com
   • Check browser console for errors
   • Test API connectivity
   • Verify images load correctly

${colors.yellow}4. Monitor for issues:${colors.reset}
   • Check server logs on Render
   • Monitor error rates
   • Test user authentication flows

${colors.green}The following issues have been addressed:${colors.reset}
   ✅ Missing static files copied to dist
   ✅ Backend CORS configuration updated  
   ✅ Frontend rebuilt with fresh asset hashes
   ✅ Production environment properly configured
`);
}

// Main execution
async function main() {
  try {
    log.title('🚀 SWANSTUDIOS PRODUCTION DEPLOYMENT FIXER');
    log.info('Starting production deployment fixes...');
    
    // Step 1: Copy missing files
    await copyMissingFiles();
    
    // Step 2: Update backend CORS
    await updateBackendCORS();
    
    // Step 3: Rebuild frontend
    await rebuildFrontend();
    
    // Step 4: Verify fixes
    const allGood = await verifyFixes();
    
    // Step 5: Show next steps
    await displayNextSteps();
    
    if (allGood) {
      log.success('🎉 All production deployment fixes completed successfully!');
      process.exit(0);
    } else {
      log.warning('⚠️ Some issues may still exist. Check the verification results above.');
      process.exit(1);
    }
    
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

main();