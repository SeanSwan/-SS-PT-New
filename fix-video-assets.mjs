#!/usr/bin/env node

/**
 * 🎥 VIDEO ASSET FIX SCRIPT
 * =========================
 * 
 * This script fixes video asset loading issues by ensuring videos are
 * properly placed in the correct directories for both development and production.
 */

import fs from 'fs';
import path from 'path';

console.log('🎥 VIDEO ASSET FIX SCRIPT');
console.log('========================');

const videoFiles = [
  'Swans.mp4',
  'smoke.mp4',
  'swan.mp4',
  'Waves.mp4',
  'Run.mp4',
  'fish.mp4',
  'forest.mp4'
];

const sourceDir = 'frontend/src/assets';
const targetDirs = [
  'frontend/public',
  'frontend/dist',
  'frontend/dist/assets'
];

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

function copyVideoFile(source, target) {
  try {
    if (fs.existsSync(source)) {
      ensureDirectoryExists(path.dirname(target));
      fs.copyFileSync(source, target);
      const stats = fs.statSync(target);
      console.log(`✅ Copied: ${target} (${Math.round(stats.size / 1024 / 1024)}MB)`);
      return true;
    } else {
      console.log(`❌ Source not found: ${source}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Failed to copy ${source} to ${target}: ${error.message}`);
    return false;
  }
}

function fixVideoAssets() {
  console.log('\\n🔍 Checking video asset locations...');

  let totalCopied = 0;
  let totalMissing = 0;

  for (const videoFile of videoFiles) {
    console.log(`\\n📹 Processing ${videoFile}:`);
    
    const sourcePath = path.join(sourceDir, videoFile);
    
    if (!fs.existsSync(sourcePath)) {
      console.log(`  ⚠️ Source missing: ${sourcePath}`);
      totalMissing++;
      continue;
    }

    const sourceStats = fs.statSync(sourcePath);
    console.log(`  📁 Source: ${sourcePath} (${Math.round(sourceStats.size / 1024 / 1024)}MB)`);

    for (const targetDir of targetDirs) {
      const targetPath = path.join(targetDir, videoFile);
      
      if (fs.existsSync(targetPath)) {
        console.log(`  ✅ Already exists: ${targetPath}`);
      } else {
        if (copyVideoFile(sourcePath, targetPath)) {
          totalCopied++;
        }
      }
    }
  }

  return { totalCopied, totalMissing };
}

function checkHeroSectionImport() {
  console.log('\\n🔍 Checking Hero-Section.tsx video import...');
  
  const heroSectionPath = 'frontend/src/pages/HomePage/components/Hero-Section.tsx';
  
  if (!fs.existsSync(heroSectionPath)) {
    console.log('❌ Hero-Section.tsx not found');
    return;
  }

  const content = fs.readFileSync(heroSectionPath, 'utf8');
  
  if (content.includes('import heroVideo from "/Swans.mp4"')) {
    console.log('✅ Found video import: import heroVideo from "/Swans.mp4"');
    console.log('📋 This import should work if Swans.mp4 is in frontend/public/');
    
    const publicVideoPath = 'frontend/public/Swans.mp4';
    if (fs.existsSync(publicVideoPath)) {
      console.log('✅ Swans.mp4 exists in frontend/public/ - import should work');
    } else {
      console.log('❌ Swans.mp4 missing from frontend/public/ - this will cause 404 errors');
    }
  } else {
    console.log('⚠️ Different video import pattern found in Hero-Section.tsx');
  }
}

function generateVideoImportExample() {
  console.log('\\n📝 Generating video import examples...');
  
  const exampleContent = `// Video Import Examples for SwanStudios
// =====================================

// Method 1: Import from public directory (recommended for large videos)
// Place video in: frontend/public/Swans.mp4
// Import as: "/Swans.mp4" (note the leading slash)
import heroVideo from "/Swans.mp4";

// Method 2: Import as asset (gets processed by Vite)
// Place video in: frontend/src/assets/Swans.mp4
// Import as module:
import heroVideoAsset from "../assets/Swans.mp4";

// Method 3: Dynamic import for conditional loading
// Use for large videos that might not always be needed
const loadHeroVideo = async () => {
  const videoModule = await import("/Swans.mp4");
  return videoModule.default;
};

// Recommended approach for SwanStudios:
// 1. Keep large videos (>10MB) in frontend/public/
// 2. Use "/video-name.mp4" import syntax
// 3. Ensure videos are copied to dist/ during build

// Example video component:
const VideoBackground = () => {
  return (
    <video autoPlay loop muted playsInline>
      <source src="/Swans.mp4" type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
};

export default VideoBackground;
`;

  fs.writeFileSync('video-import-examples.jsx', exampleContent);
  console.log('✅ Created video-import-examples.jsx');
}

// Main execution
function runVideoFix() {
  const { totalCopied, totalMissing } = fixVideoAssets();
  checkHeroSectionImport();
  generateVideoImportExample();
  
  console.log('\\n🎉 VIDEO ASSET FIX SUMMARY');
  console.log('==========================');
  console.log(`✅ Videos copied: ${totalCopied}`);
  console.log(`⚠️ Videos missing: ${totalMissing}`);
  
  if (totalMissing > 0) {
    console.log('\\n💡 To fix missing videos:');
    console.log('1. Check if videos exist in frontend/src/assets/');
    console.log('2. Download missing videos and place in frontend/src/assets/');
    console.log('3. Re-run this script');
  }
  
  console.log('\\n🚀 Next steps:');
  console.log('1. Restart your frontend dev server');
  console.log('2. Check browser console for video loading errors');
  console.log('3. Verify videos play correctly on homepage');
}

runVideoFix();
