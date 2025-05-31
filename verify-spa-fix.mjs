#!/usr/bin/env node

/**
 * 🔧 SPA ROUTING FIX VERIFICATION
 * ===============================
 * 
 * This script verifies that the SPA routing fix is properly configured
 * and checks if the frontend build exists.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 SPA ROUTING FIX VERIFICATION');
console.log('===============================');

function checkFrontendBuild() {
  console.log('\n📦 Checking frontend build...');
  
  const frontendDistPath = path.join(__dirname, 'frontend/dist');
  const indexPath = path.join(frontendDistPath, 'index.html');
  
  if (!fs.existsSync(frontendDistPath)) {
    console.log('❌ Frontend dist directory missing');
    console.log(`   Expected: ${frontendDistPath}`);
    console.log('   Solution: Run "cd frontend && npm run build"');
    return false;
  }
  
  console.log('✅ Frontend dist directory exists');
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ index.html missing from dist');
    console.log('   Solution: Rebuild frontend');
    return false;
  }
  
  console.log('✅ index.html exists in dist');
  
  // Check file sizes to ensure build completed properly
  const stats = fs.statSync(indexPath);
  console.log(`📊 index.html size: ${stats.size} bytes`);
  
  if (stats.size < 100) {
    console.log('⚠️ index.html seems too small - build may have failed');
    return false;
  }
  
  // Check for common build artifacts
  const distContents = fs.readdirSync(frontendDistPath);
  console.log(`📁 Dist contents: ${distContents.join(', ')}`);
  
  const hasAssets = distContents.some(file => 
    file.includes('.js') || file.includes('.css') || file === 'assets'
  );
  
  if (!hasAssets) {
    console.log('⚠️ No JS/CSS assets found - build may be incomplete');
    return false;
  }
  
  console.log('✅ Frontend build appears complete');
  return true;
}

function checkServerConfiguration() {
  console.log('\n🔧 Checking server configuration...');
  
  const serverPath = path.join(__dirname, 'backend/server.mjs');
  
  if (!fs.existsSync(serverPath)) {
    console.log('❌ server.mjs not found');
    return false;
  }
  
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  // Check for SPA routing configuration
  const hasSpaRouting = serverContent.includes('SPA ROUTING CATCH-ALL');
  const hasStaticServing = serverContent.includes('FRONTEND STATIC FILES');
  
  console.log(`✅ SPA routing configuration: ${hasSpaRouting ? 'FOUND' : 'MISSING'}`);
  console.log(`✅ Static file serving: ${hasStaticServing ? 'FOUND' : 'MISSING'}`);
  
  if (!hasSpaRouting || !hasStaticServing) {
    console.log('❌ Server configuration incomplete');
    return false;
  }
  
  console.log('✅ Server configuration looks good');
  return true;
}

function generateDeploymentInstructions() {
  console.log('\n🚀 DEPLOYMENT INSTRUCTIONS');
  console.log('==========================');
  
  console.log('1. Build frontend (if not already done):');
  console.log('   cd frontend && npm run build');
  console.log('');
  console.log('2. Commit and push changes:');
  console.log('   git add backend/server.mjs');
  console.log('   git commit -m "🔧 Add SPA routing support for client-side routes"');
  console.log('   git push origin main');
  console.log('');
  console.log('3. Wait for Render deployment');
  console.log('');
  console.log('4. Test the fix:');
  console.log('   - Visit: https://sswanstudios.com/client-dashboard');
  console.log('   - Refresh the page');
  console.log('   - Should load React app (not 404)');
  console.log('');
  console.log('5. Other routes to test:');
  console.log('   - https://sswanstudios.com/store');
  console.log('   - https://sswanstudios.com/about');
  console.log('   - https://sswanstudios.com/contact');
}

function main() {
  const buildOk = checkFrontendBuild();
  const serverOk = checkServerConfiguration();
  
  console.log('\n🎯 VERIFICATION SUMMARY');
  console.log('======================');
  console.log(`Frontend Build: ${buildOk ? '✅ READY' : '❌ NEEDS BUILD'}`);
  console.log(`Server Config: ${serverOk ? '✅ CONFIGURED' : '❌ NEEDS FIX'}`);
  
  if (!buildOk) {
    console.log('\n⚠️ FRONTEND BUILD REQUIRED');
    console.log('Run: cd frontend && npm run build');
    console.log('Then re-run this verification script');
    return;
  }
  
  if (!serverOk) {
    console.log('\n⚠️ SERVER CONFIGURATION MISSING');
    console.log('The SPA routing fix was not applied correctly');
    return;
  }
  
  console.log('\n🎉 SPA ROUTING FIX READY FOR DEPLOYMENT!');
  generateDeploymentInstructions();
}

main();