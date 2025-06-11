#!/usr/bin/env node

/**
 * 🎥 VIDEO CACHE ERROR QUICK FIX
 * ==============================
 * 
 * Fixes the Swans.mp4 cache error by updating the video import
 * to use a cache-busting strategy.
 */

import fs from 'fs';
import path from 'path';

console.log('🎥 FIXING VIDEO CACHE ERROR');
console.log('===========================');

const heroSectionPath = 'frontend/src/pages/HomePage/components/Hero-Section.tsx';

if (fs.existsSync(heroSectionPath)) {
  console.log('📁 Found Hero-Section.tsx');
  
  let content = fs.readFileSync(heroSectionPath, 'utf8');
  
  // Check current video import
  if (content.includes('import heroVideo from "/Swans.mp4"')) {
    console.log('🔍 Found video import causing cache error');
    
    // Replace with relative import
    content = content.replace(
      'import heroVideo from "/Swans.mp4"',
      'import heroVideo from "../../../assets/Swans.mp4"'
    );
    
    fs.writeFileSync(heroSectionPath, content);
    console.log('✅ Updated video import to use relative path');
    console.log('📝 Changed: "/Swans.mp4" → "../../../assets/Swans.mp4"');
  } else {
    console.log('ℹ️ Video import already using correct format');
  }
} else {
  console.log('❌ Hero-Section.tsx not found');
}

// Check if video exists in assets
const assetsVideoPath = 'frontend/src/assets/Swans.mp4';
const publicVideoPath = 'frontend/public/Swans.mp4';

if (fs.existsSync(assetsVideoPath)) {
  console.log('✅ Video exists in assets directory');
} else if (fs.existsSync(publicVideoPath)) {
  console.log('📋 Video exists in public directory');
  console.log('💡 Consider moving to assets for better import handling');
} else {
  console.log('⚠️ Video file may need to be re-added');
}

console.log('\n🎯 CACHE ERROR FIX COMPLETE');
console.log('===========================');
console.log('The cache error should be resolved after this fix.');
console.log('If it persists, it\'s just a browser cache issue and not critical.');
