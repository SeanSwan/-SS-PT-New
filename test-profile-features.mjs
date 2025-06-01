/**
 * Database Connection Test for User Profile Features
 * ==================================================
 * Test script to verify that the enhanced User Profile is properly connected
 * to the SwanStudios PostgreSQL database
 */

// This test should be run from the backend directory
// node test-profile-features.mjs

import { fileURLToPath } from 'url';
import path from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set NODE_ENV for testing
process.env.NODE_ENV = 'development';

const runProfileTests = async () => {
  try {
    console.log('🚀 Starting User Profile Database Connection Tests...');
    console.log('='.repeat(60));

    // Import models and test basic connections
    const { default: User } = await import('./backend/models/User.mjs');
    const { SocialPost, Friendship } = await import('./backend/models/social/index.mjs');
    
    console.log('✅ Models imported successfully');
    
    // Test 1: User model functionality
    console.log('\n📊 Test 1: User Model Connection');
    const userCount = await User.count();
    console.log(`   Found ${userCount} users in database`);
    
    // Test 2: Social models
    console.log('\n📊 Test 2: Social Models Connection');
    const postCount = await SocialPost.count();
    const friendshipCount = await Friendship.count();
    console.log(`   Found ${postCount} social posts in database`);
    console.log(`   Found ${friendshipCount} friendships in database`);
    
    // Test 3: Profile controller functions
    console.log('\n📊 Test 3: Profile Controller Import');
    const profileController = await import('./backend/controllers/profileController.mjs');
    console.log('   ✅ Profile controller functions available:');
    console.log(`      - getUserProfile: ${typeof profileController.getUserProfile}`);
    console.log(`      - getUserStats: ${typeof profileController.getUserStats}`);
    console.log(`      - getUserPosts: ${typeof profileController.getUserPosts}`);
    console.log(`      - getUserAchievements: ${typeof profileController.getUserAchievements}`);
    console.log(`      - getUserFollowStats: ${typeof profileController.getUserFollowStats}`);
    
    // Test 4: API Routes
    console.log('\n📊 Test 4: Profile Routes Import');
    const profileRoutes = await import('./backend/routes/profileRoutes.mjs');
    console.log('   ✅ Profile routes imported successfully');
    
    console.log('\n🎉 All Profile Database Connection Tests Passed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start the backend server: npm run dev');
    console.log('   2. Start the frontend: cd frontend && npm run dev');
    console.log('   3. Navigate to /user-dashboard to test the enhanced profile');
    console.log('   4. Test profile photo upload, stats display, and social features');
    
  } catch (error) {
    console.error('❌ Profile Database Connection Test Failed:');
    console.error(error);
    process.exit(1);
  }
};

// Run the tests
runProfileTests();
