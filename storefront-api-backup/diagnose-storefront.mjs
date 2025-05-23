#!/usr/bin/env node
/**
 * Complete StoreFront Diagnostic Script
 * Checks all aspects that could prevent StoreFront from rendering
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 StoreFront Diagnostic Check\n');

// 1. Check if StoreFront component exists and is valid
async function checkStoreFrontComponent() {
  console.log('1. Checking StoreFront component file...');
  
  const storefrontPath = join(__dirname, 'frontend/src/pages/shop/StoreFront.component.tsx');
  
  try {
    const exists = await fs.access(storefrontPath).then(() => true).catch(() => false);
    if (!exists) {
      console.log('   ❌ StoreFront.component.tsx not found!');
      return false;
    }
    
    console.log('   ✅ File exists');
    
    // Check file content
    const content = await fs.readFile(storefrontPath, 'utf-8');
    if (content.length < 1000) {
      console.log('   ⚠️  File seems too small, might be corrupted');
      return false;
    }
    
    // Check for export
    if (!content.includes('export default StoreFront')) {
      console.log('   ❌ Default export not found!');
      return false;
    }
    
    console.log('   ✅ File appears valid');
    return true;
  } catch (error) {
    console.log('   ❌ Error checking file:', error.message);
    return false;
  }
}

// 2. Check required dependencies
async function checkDependencies() {
  console.log('\n2. Checking package dependencies...');
  
  const packagePath = join(__dirname, 'frontend/package.json');
  
  try {
    const packageData = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
    const deps = { ...packageData.dependencies, ...packageData.devDependencies };
    
    const requiredDeps = [
      'react',
      'styled-components',
      'framer-motion',
      '@tanstack/react-query'
    ];
    
    let allPresent = true;
    for (const dep of requiredDeps) {
      if (deps[dep]) {
        console.log(`   ✅ ${dep}: ${deps[dep]}`);
      } else {
        console.log(`   ❌ Missing: ${dep}`);
        allPresent = false;
      }
    }
    
    return allPresent;
  } catch (error) {
    console.log('   ❌ Error checking package.json:', error.message);
    return false;
  }
}

// 3. Check routes configuration
async function checkRoutesConfig() {
  console.log('\n3. Checking routes configuration...');
  
  const routesPath = join(__dirname, 'frontend/src/routes/main-routes.tsx');
  
  try {
    const content = await fs.readFile(routesPath, 'utf-8');
    
    // Check for StoreFront import
    if (!content.includes('StoreFront.component')) {
      console.log('   ❌ StoreFront import not found in routes');
      return false;
    }
    
    // Check for store paths
    const storeRoutes = [
      "path: 'store'",
      "path: 'shop/training-packages'"
    ];
    
    let routesFound = 0;
    for (const route of storeRoutes) {
      if (content.includes(route)) {
        console.log(`   ✅ Found: ${route}`);
        routesFound++;
      }
    }
    
    if (routesFound === 0) {
      console.log('   ❌ No StoreFront routes found');
      return false;
    }
    
    console.log(`   ✅ Found ${routesFound} StoreFront routes`);
    return true;
  } catch (error) {
    console.log('   ❌ Error checking routes:', error.message);
    return false;
  }
}

// 4. Check public assets
async function checkPublicAssets() {
  console.log('\n4. Checking public assets...');
  
  const publicPath = join(__dirname, 'frontend/public');
  const requiredAssets = [
    'Swans.mp4',
    'Logo.png',
    'marble-texture.png'
  ];
  
  let allPresent = true;
  for (const asset of requiredAssets) {
    const assetPath = join(publicPath, asset);
    try {
      await fs.access(assetPath);
      console.log(`   ✅ ${asset} exists`);
    } catch {
      console.log(`   ❌ Missing: ${asset}`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

// 5. Check context providers
async function checkContextProviders() {
  console.log('\n5. Checking context providers...');
  
  const contextPaths = [
    'frontend/src/context/AuthContext.tsx',
    'frontend/src/context/CartContext.tsx'
  ];
  
  let allPresent = true;
  for (const path of contextPaths) {
    const fullPath = join(__dirname, path);
    try {
      await fs.access(fullPath);
      console.log(`   ✅ ${path.split('/').pop()} exists`);
    } catch {
      console.log(`   ❌ Missing: ${path.split('/').pop()}`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

// 6. Generate comprehensive report
async function generateReport() {
  console.log('\n📊 Diagnostic Summary:');
  console.log('======================');
  
  const results = {
    component: await checkStoreFrontComponent(),
    dependencies: await checkDependencies(),
    routes: await checkRoutesConfig(),
    assets: await checkPublicAssets(),
    contexts: await checkContextProviders()
  };
  
  let overallHealth = 0;
  for (const [key, value] of Object.entries(results)) {
    const status = value ? '✅ PASS' : '❌ FAIL';
    console.log(`${key.padEnd(12)}: ${status}`);
    if (value) overallHealth++;
  }
  
  console.log(`\nOverall Health: ${overallHealth}/5 (${(overallHealth/5*100).toFixed(0)}%)`);
  
  if (overallHealth < 5) {
    console.log('\n🚨 Issues Detected:');
    if (!results.component) {
      console.log('• StoreFront component file issues detected');
    }
    if (!results.dependencies) {
      console.log('• Missing or incorrect dependencies');
    }
    if (!results.routes) {
      console.log('• Routes configuration problems');
    }
    if (!results.assets) {
      console.log('• Missing public assets (videos, images)');
    }
    if (!results.contexts) {
      console.log('• Missing context providers');
    }
    
    console.log('\n💡 Recommended Actions:');
    console.log('1. Run: npm install (to ensure all dependencies are installed)');
    console.log('2. Check browser console for JavaScript errors');
    console.log('3. Verify backend API is running and accessible');
    console.log('4. Check if database is seeded with packages');
  } else {
    console.log('\n✨ All checks passed! StoreFront should be working.');
    console.log('\nIf StoreFront still appears blank:');
    console.log('1. Check browser console for runtime errors');
    console.log('2. Verify API endpoints are responding');
    console.log('3. Check if user authentication is working');
    console.log('4. Try the debug version at /debug-store');
  }
}

// Run the diagnostic
generateReport().catch(console.error);
