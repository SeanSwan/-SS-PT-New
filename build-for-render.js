/**
 * Render Build Script (Node.js version)
 * Fallback script for reliable frontend building on Render
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 RENDER BUILD: Starting SwanStudios build process...');

try {
  // Phase 1: Backend dependencies
  console.log('📦 Phase 1: Installing backend dependencies...');
  process.chdir('backend');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Backend dependencies installed');
  process.chdir('..');

  // Phase 2: Frontend dependencies
  console.log('📦 Phase 2: Installing frontend dependencies...');
  process.chdir('frontend');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Frontend dependencies installed');

  // Phase 3: Clear cache and build
  console.log('🏗️ Phase 3: Building frontend with cache clear...');
  execSync('npm run clear-cache', { stdio: 'inherit' });
  execSync('npm run build:production', { stdio: 'inherit' });
  console.log('✅ Frontend built successfully');

  // Phase 4: Verify build
  console.log('🔍 Phase 4: Verifying build output...');
  const indexPath = path.join(process.cwd(), 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('✅ index.html found');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    
    const jsAssets = indexContent.match(/src="[^"]*\.js"/g) || [];
    const cssAssets = indexContent.match(/href="[^"]*\.css"/g) || [];
    
    console.log('📄 Asset references in index.html:');
    console.log('JS Assets:', jsAssets);
    console.log('CSS Assets:', cssAssets);
  } else {
    console.error('❌ ERROR: dist/index.html not found!');
    process.exit(1);
  }

  // Phase 5: Return to root
  process.chdir('..');
  
  console.log('🎉 RENDER BUILD COMPLETE: Frontend assets generated successfully!');
  console.log('🔥 This will fix the 404 asset loading errors!');

} catch (error) {
  console.error('❌ BUILD FAILED:', error.message);
  process.exit(1);
}
