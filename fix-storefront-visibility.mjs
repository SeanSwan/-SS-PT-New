#!/usr/bin/env node
/**
 * StoreFront Visibility Fix Script
 * Diagnoses and fixes StoreFront rendering issues
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 StoreFront Visibility Fix\n');

// 1. Run our diagnostic script
console.log('1. Running diagnostic checks...');
try {
  execSync('node diagnose-storefront.mjs', { 
    cwd: __dirname, 
    stdio: 'inherit',
    encoding: 'utf-8' 
  });
} catch (error) {
  console.log('Diagnostic completed with some issues detected');
}

// 2. Add debug route to help identify the issue
console.log('\n2. Adding debug route...');
const routesPath = join(__dirname, 'frontend/src/routes/main-routes.tsx');

try {
  let routesContent = await fs.readFile(routesPath, 'utf-8');
  
  // Add simplified component import
  const importSection = `const DebugStoreFront = lazyLoadWithErrorHandling(
  () => import('../pages/shop/DebugStoreFront.component'),
  'Debug Storefront'
);
const SimplifiedStoreFront = lazyLoadWithErrorHandling(
  () => import('../pages/shop/SimplifiedStoreFront.component'),
  'Simplified Storefront'
);`;

  if (!routesContent.includes('SimplifiedStoreFront')) {
    routesContent = routesContent.replace(
      /const DebugStoreFront = lazyLoadWithErrorHandling[\s\S]*?\);/, 
      importSection
    );
  }
  
  // Add debug routes
  const debugRoutes = `    // Debug routes for StoreFront troubleshooting
    {
      path: 'debug-store',
      element: (
        <Suspense fallback={<PageLoader />}>
          <DebugStoreFront />
        </Suspense>
      )
    },
    {
      path: 'simple-store',
      element: (
        <Suspense fallback={<PageLoader />}>
          <SimplifiedStoreFront />
        </Suspense>
      )
    },`;
  
  if (!routesContent.includes('debug-store')) {
    // Insert debug routes before the fallback route
    routesContent = routesContent.replace(
      /\s+\/\/ Fallback Route \(404\)/,
      `\n${debugRoutes}\n    // Fallback Route (404)`
    );
  }
  
  await fs.writeFile(routesPath, routesContent);
  console.log('   ✅ Debug routes added');
} catch (error) {
  console.log('   ⚠️ Could not add debug routes:', error.message);
}

// 3. Create a comprehensive test script
console.log('\n3. Creating test script...');
const testScript = `#!/bin/bash

echo "🧪 StoreFront Testing Guide"
echo "=========================="
echo ""

echo "1. Test Pages Available:"
echo "   • Main StoreFront: http://localhost:3000/store"
echo "   • Debug Version: http://localhost:3000/debug-store"
echo "   • Simple Version: http://localhost:3000/simple-store"
echo ""

echo "2. Check Browser Console for:"
echo "   • JavaScript errors"
echo "   • Failed API requests"
echo "   • Component rendering logs"
echo ""

echo "3. Common Issues & Solutions:"
echo ""
echo "   Issue: Blank page with no errors"
echo "   Solution: Check if backend is running on port 3000"
echo ""
echo "   Issue: 'Cannot read property of undefined'"
echo "   Solution: Check Context providers in App.tsx"
echo ""
echo "   Issue: Packages not loading"
echo "   Solution: Run database seeder"
echo ""

echo "4. Quick Commands:"
echo "   • Start backend: npm run server"
echo "   • Start frontend: npm run dev"
echo "   • Seed database: npm run seed"
echo ""

echo "5. API Test:"
curl -s http://localhost:3000/api/storefront | jq .

echo ""
echo "✨ Open the simple version to see if basic rendering works:"
echo "   http://localhost:3000/simple-store"
`;

await fs.writeFile(join(__dirname, 'test-storefront.sh'), testScript);
await fs.chmod(join(__dirname, 'test-storefront.sh'), '755');

// 4. Check if the seeder needs to be run
console.log('\n4. Checking database seeding...');
try {
  console.log('   Testing API connection...');
  const { default: axios } = await import('axios');
  const response = await axios.get('http://localhost:3000/api/storefront');
  
  if (response.data?.items?.length > 0) {
    console.log(`   ✅ Database has ${response.data.items.length} packages`);
  } else {
    console.log('   ⚠️ No packages found, running seeder...');
    try {
      execSync('cd backend && node seeders/20250516-storefront-items.mjs', { 
        cwd: __dirname,
        stdio: 'inherit'
      });
      console.log('   ✅ Seeder completed');
    } catch (seedError) {
      console.log('   ❌ Seeder failed:', seedError.message);
    }
  }
} catch (apiError) {
  console.log('   ⚠️ Cannot connect to API. Make sure backend is running.');
  console.log('   Run: npm run server');
}

// 5. Final instructions
console.log('\n📋 Next Steps:');
console.log('=============');
console.log('');
console.log('1. Ensure backend is running:');
console.log('   cd backend && npm start');
console.log('');
console.log('2. Test the simplified version:');
console.log('   http://localhost:3000/simple-store');
console.log('');
console.log('3. If simple version works but main doesn\'t:');
console.log('   - Issue is with styled-components or complex animations');
console.log('   - Check browser console for specific errors');
console.log('');
console.log('4. If simple version doesn\'t work:');
console.log('   - Issue is with context providers or API');
console.log('   - Check AuthContext and CartContext');
console.log('');
console.log('🔧 Debug files created:');
console.log('   • ./test-storefront.sh - Testing guide');
console.log('   • /debug-store - Debug StoreFront');
console.log('   • /simple-store - Minimal StoreFront');
