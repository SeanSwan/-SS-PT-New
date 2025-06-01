#!/usr/bin/env node

/**
 * 🎬 Video & Service Worker Error Fix Script
 * ==========================================
 * 
 * Fixes the following issues:
 * 1. Service worker cache errors for hashed video assets
 * 2. Video file reference conflicts between assets and public directory
 * 3. Cache corruption causing "Failed to convert value to 'Response'" errors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎬 Starting Video & Service Worker Error Fix...\n');

// Helper function to check if file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

// Helper function to update cache version
function updateServiceWorkerCacheVersion() {
  const swPath = path.join(__dirname, 'frontend', 'public', 'spa-sw.js');
  
  if (!fileExists(swPath)) {
    console.log('❌ Service worker file not found at:', swPath);
    return false;
  }

  try {
    let swContent = fs.readFileSync(swPath, 'utf8');
    
    // Update cache version to force cache refresh
    const currentVersion = swContent.match(/CACHE_NAME = ['`]swanstudios-spa-v(\d+)['`]/);
    if (currentVersion) {
      const newVersion = parseInt(currentVersion[1]) + 1;
      swContent = swContent.replace(
        /CACHE_NAME = ['`]swanstudios-spa-v\d+['`]/,
        `CACHE_NAME = 'swanstudios-spa-v${newVersion}'`
      );
      
      fs.writeFileSync(swPath, swContent);
      console.log('✅ Updated service worker cache version to v' + newVersion);
      return true;
    } else {
      console.log('⚠️  Could not find cache version in service worker');
      return false;
    }
  } catch (error) {
    console.log('❌ Error updating service worker:', error.message);
    return false;
  }
}

// Helper function to ensure video files are in correct locations
function ensureVideoFilesExist() {
  const videoChecks = [
    {
      path: path.join(__dirname, 'frontend', 'public', 'Swans.mp4'),
      description: 'Public directory Swans.mp4'
    },
    {
      path: path.join(__dirname, 'frontend', 'src', 'assets', 'Swans.mp4'),
      description: 'Assets directory Swans.mp4'
    }
  ];

  let allExist = true;
  
  for (const check of videoChecks) {
    if (fileExists(check.path)) {
      console.log('✅', check.description, 'exists');
    } else {
      console.log('❌', check.description, 'missing');
      allExist = false;
    }
  }

  return allExist;
}

// Helper function to create cache clearing utility
function createCacheClearingUtility() {
  const utilityPath = path.join(__dirname, 'frontend', 'src', 'utils', 'clearCache.js');
  
  // Ensure utils directory exists
  const utilsDir = path.dirname(utilityPath);
  if (!fileExists(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true });
  }

  const cacheUtilityContent = `/**
 * Cache Clearing Utility
 * =====================
 * 
 * Provides functions to clear browser caches and fix service worker issues
 */

export const clearAllCaches = async () => {
  try {
    // Clear all caches
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map(cacheName => caches.delete(cacheName));
    await Promise.all(deletePromises);
    
    console.log('✅ All caches cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    return false;
  }
};

export const unregisterServiceWorkers = async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const unregisterPromises = registrations.map(registration => registration.unregister());
      await Promise.all(unregisterPromises);
      
      console.log('✅ All service workers unregistered');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error unregistering service workers:', error);
    return false;
  }
};

export const forceReload = () => {
  // Force a hard reload to clear any cached resources
  if (window.location.reload) {
    window.location.reload(true);
  } else {
    window.location.href = window.location.href;
  }
};

export const clearVideoCache = async () => {
  try {
    // Clear any cached video elements
    const videoElements = document.querySelectorAll('video');
    videoElements.forEach(video => {
      if (video.src) {
        video.load(); // Force reload of video
      }
    });
    
    console.log('✅ Video cache cleared');
    return true;
  } catch (error) {
    console.error('❌ Error clearing video cache:', error);
    return false;
  }
};

// Emergency cache clearing function for dev console
window.emergencyCacheClear = async () => {
  console.log('🚨 Emergency cache clearing initiated...');
  
  await clearAllCaches();
  await unregisterServiceWorkers();
  await clearVideoCache();
  
  console.log('🎉 Emergency cache clear complete! Reloading page...');
  setTimeout(() => forceReload(), 1000);
};

console.log('💡 Cache clearing utility loaded. Run emergencyCacheClear() in dev console if needed.');
`;

  try {
    fs.writeFileSync(utilityPath, cacheUtilityContent);
    console.log('✅ Created cache clearing utility at:', utilityPath);
    return true;
  } catch (error) {
    console.log('❌ Error creating cache utility:', error.message);
    return false;
  }
}

// Helper function to create a batch file for quick fixes
function createQuickFixBatch() {
  const batchContent = `@echo off
echo 🎬 Quick Video & Service Worker Fix
echo ====================================

echo.
echo 1. Clearing Vite cache...
if exist "frontend\\.vite-cache" (
    rmdir /s /q "frontend\\.vite-cache"
    echo ✅ Vite cache cleared
) else (
    echo ⚠️  No Vite cache found
)

echo.
echo 2. Clearing node_modules cache...
if exist "frontend\\node_modules\\.cache" (
    rmdir /s /q "frontend\\node_modules\\.cache"
    echo ✅ Node modules cache cleared
) else (
    echo ⚠️  No node modules cache found
)

echo.
echo 3. Rebuilding frontend...
cd frontend
call npm run build
if %ERRORLEVEL% EQU 0 (
    echo ✅ Frontend rebuilt successfully
) else (
    echo ❌ Frontend build failed
    pause
    exit /b 1
)

echo.
echo 4. Starting development server...
call npm run dev

pause
`;

  try {
    fs.writeFileSync(path.join(__dirname, 'QUICK-VIDEO-FIX.bat'), batchContent);
    console.log('✅ Created quick fix batch file: QUICK-VIDEO-FIX.bat');
    return true;
  } catch (error) {
    console.log('❌ Error creating batch file:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  let allSuccessful = true;

  console.log('📋 Checking video file locations...');
  if (!ensureVideoFilesExist()) {
    console.log('⚠️  Some video files are missing. Please ensure Swans.mp4 exists in both:');
    console.log('   - frontend/public/Swans.mp4');
    console.log('   - frontend/src/assets/Swans.mp4');
    allSuccessful = false;
  }

  console.log('\n🔄 Updating service worker cache version...');
  if (!updateServiceWorkerCacheVersion()) {
    allSuccessful = false;
  }

  console.log('\n🛠️  Creating cache clearing utility...');
  if (!createCacheClearingUtility()) {
    allSuccessful = false;
  }

  console.log('\n📁 Creating quick fix batch file...');
  if (!createQuickFixBatch()) {
    allSuccessful = false;
  }

  console.log('\n' + '='.repeat(60));
  
  if (allSuccessful) {
    console.log('🎉 All fixes applied successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Run: npm run build (in frontend directory)');
    console.log('   2. Clear browser cache (Ctrl+Shift+R)');
    console.log('   3. Test in incognito mode');
    console.log('   4. If issues persist, run emergencyCacheClear() in dev console');
    console.log('\n⚡ Quick fix: Run QUICK-VIDEO-FIX.bat for automated rebuild');
  } else {
    console.log('⚠️  Some fixes could not be applied. Please check the errors above.');
  }
  
  console.log('\n🔧 Manual Steps if Issues Persist:');
  console.log('   1. Open browser dev tools (F12)');
  console.log('   2. Go to Application > Storage');
  console.log('   3. Click "Clear Storage" > "Clear site data"');
  console.log('   4. Restart browser');
  console.log('   5. Test in incognito mode');
}

main().catch(console.error);
