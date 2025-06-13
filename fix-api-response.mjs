#!/usr/bin/env node
/**
 * 🔧 QUICK FIX: Frontend API Response Structure
 * ============================================ 
 * Fixes the response.data.packages to response.data.items mismatch
 */

import { readFileSync, writeFileSync } from 'fs';

console.log('🔧 Fixing frontend API response structure...');

const filePath = './frontend/src/pages/shop/GalaxyThemedStoreFront.tsx';

try {
  let content = readFileSync(filePath, 'utf8');
  
  // Fix the API response structure mismatch
  content = content.replace(
    'response.data.packages',
    'response.data.items'
  );
  
  writeFileSync(filePath, content);
  
  console.log('✅ Fixed API response structure mismatch!');
  console.log('🔄 Frontend now expects response.data.items from storefront API');
  
} catch (error) {
  console.error('❌ Failed to fix API response structure:', error.message);
}
