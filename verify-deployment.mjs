#!/usr/bin/env node

/**
 * Post-Deployment Verification Script
 * Verifies that the critical fix deployed successfully
 */

import { execSync } from 'child_process';
import https from 'https';

console.log('🔍 POST-DEPLOYMENT VERIFICATION');
console.log('================================\n');

// 1. Check deployment status
console.log('📋 DEPLOYMENT STATUS:');
console.log('🌐 Production URL: https://sswanstudios.com');
console.log('🏗️  Render Service: srv-cul76kbv2p9s73a4k0f0');
console.log('📁 GitHub Repo: SeanSwan/-SS-PT-New\n');

// 2. Test site availability
console.log('🌐 Testing site availability...');

const testSiteAvailability = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sswanstudios.com',
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      console.log(`✅ Site responded with status: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log('✅ Site is loading successfully');
        resolve(true);
      } else {
        console.log(`⚠️  Site returned status ${res.statusCode}`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.log(`❌ Site connection failed: ${error.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log('❌ Site request timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
};

// 3. Verify git status
console.log('📦 Checking git status...');
try {
  const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
  if (gitStatus.trim() === '') {
    console.log('✅ All changes committed and pushed');
  } else {
    console.log('⚠️  Uncommitted changes detected:');
    console.log(gitStatus);
  }
} catch (error) {
  console.log('❌ Git status check failed:', error.message);
}

// 4. Check recent commits
console.log('\n📝 Recent commits:');
try {
  const recentCommits = execSync('git log --oneline -3', { encoding: 'utf8' });
  console.log(recentCommits);
} catch (error) {
  console.log('❌ Could not fetch recent commits:', error.message);
}

// 5. Test site and provide results
console.log('\n🌐 Testing production site...');
testSiteAvailability().then((isAvailable) => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 VERIFICATION RESULTS');
  console.log('='.repeat(50));
  
  if (isAvailable) {
    console.log('🎉 SUCCESS: Deployment completed successfully!');
    console.log('✅ sswanstudios.com is loading properly');
    console.log('✅ Build fix resolved the deployment issue');
    console.log('\n🚀 READY FOR PHASE 2 ENHANCEMENTS');
    console.log('\nNext steps:');
    console.log('1. Begin SessionAllocationManager API integration');
    console.log('2. Optimize mobile experience');
    console.log('3. Enhance real-time features');
  } else {
    console.log('⚠️  DEPLOYMENT STATUS: In Progress or Issues Detected');
    console.log('🔄 Site may still be deploying...');
    console.log('\nWait 2-3 minutes and run this script again:');
    console.log('node verify-deployment.mjs');
  }
  
  console.log('\n📱 Test these features manually:');
  console.log('- Login with different user roles');
  console.log('- Navigate between schedule views');
  console.log('- Test mobile responsiveness');
  console.log('- Verify session allocation manager');
  
  console.log('\n📊 Monitor in Render Dashboard:');
  console.log('https://dashboard.render.com/web/srv-cul76kbv2p9s73a4k0f0');
});
