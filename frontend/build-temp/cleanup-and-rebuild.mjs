#!/usr/bin/env node
/**
 * SWANSTUDIOS ASSET LOADING FIX - PHASE 1
 * =======================================
 * Clean build artifacts and execute fresh production build
 * Fixes asset version mismatch causing 404 errors
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

console.log('🔧 SWANSTUDIOS ASSET LOADING FIX - PHASE 1: CLEANUP & REBUILD');
console.log('=============================================================');

// Step 1: Clear Vite cache
console.log('\n📦 Step 1: Clearing Vite cache...');
try {
  process.chdir(frontendDir);
  execSync('node .vite-cache-cleaner.js', { stdio: 'inherit' });
  console.log('✅ Cache cleared successfully');
} catch (error) {
  console.log('⚠️ Cache cleaner completed with warnings');
}

// Step 2: Remove existing dist directory
console.log('\n🗑️ Step 2: Removing existing build artifacts...');
const distPath = path.join(frontendDir, 'dist');
if (fs.existsSync(distPath)) {
  try {
    fs.rmSync(distPath, { recursive: true, force: true });
    console.log('✅ Existing dist directory removed');
  } catch (error) {
    console.error('❌ Error removing dist directory:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️ No existing dist directory found');
}

// Step 3: Verify dist is gone
if (fs.existsSync(distPath)) {
  console.error('❌ CRITICAL: dist directory still exists after removal attempt');
  process.exit(1);
}

// Step 4: Run fresh production build
console.log('\n🏗️ Step 3: Running fresh production build...');
try {
  execSync('npm run build:production', { 
    stdio: 'inherit',
    cwd: frontendDir,
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });
  console.log('✅ Production build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 5: Verify new build exists
console.log('\n🔍 Step 4: Verifying new build...');
const newIndexPath = path.join(distPath, 'index.html');
if (!fs.existsSync(newIndexPath)) {
  console.error('❌ CRITICAL: New index.html not found after build');
  process.exit(1);
}

// Step 6: Check asset references in new index.html
const indexContent = fs.readFileSync(newIndexPath, 'utf8');
const jsAssetMatch = indexContent.match(/src="\/assets\/(index-[^"]+\.js)"/);
const cssAssetMatch = indexContent.match(/href="\/assets\/(index-[^"]+\.css)"/);

if (!jsAssetMatch || !cssAssetMatch) {
  console.error('❌ CRITICAL: Could not find asset references in new index.html');
  console.log('Index.html content:', indexContent);
  process.exit(1);
}

const jsAssetFile = jsAssetMatch[1];
const cssAssetFile = cssAssetMatch[1];

console.log('✅ New build verified:');
console.log(`   📄 index.html: ${newIndexPath}`);
console.log(`   📦 JS Asset: ${jsAssetFile}`);
console.log(`   🎨 CSS Asset: ${cssAssetFile}`);

// Step 7: Verify actual asset files exist
const jsAssetPath = path.join(distPath, 'assets', jsAssetFile);
const cssAssetPath = path.join(distPath, 'assets', cssAssetFile);

if (!fs.existsSync(jsAssetPath)) {
  console.error(`❌ CRITICAL: JS asset file not found: ${jsAssetPath}`);
  process.exit(1);
}

if (!fs.existsSync(cssAssetPath)) {
  console.error(`❌ CRITICAL: CSS asset file not found: ${cssAssetPath}`);
  process.exit(1);
}

console.log('✅ Asset files verified on disk');

// Step 8: Summary
console.log('\n🎉 PHASE 1 COMPLETE: FRONTEND BUILD VERIFICATION & REBUILD');
console.log('=======================================================');
console.log('✅ Cache cleared successfully');
console.log('✅ Old build artifacts removed');
console.log('✅ Fresh production build completed');
console.log('✅ New asset references verified');
console.log('✅ Asset files exist on disk');
console.log('\n🚀 Ready for Phase 2: Deployment Sync & Cache Bust');
console.log('   Next: git add, commit, and push to deploy fixed assets');

process.exit(0);
