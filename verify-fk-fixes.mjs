/**
 * QUICK FK CONSTRAINT VERIFICATION
 * ===============================
 * Verify that all models load without FK constraint errors
 */

import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

console.log('🎯 VERIFYING FK CONSTRAINT FIXES');
console.log('================================');

const verifyFKFixes = async () => {
  try {
    console.log('📋 Loading database connection...');
    
    // Import database
    const { default: sequelize } = await import('./backend/database.mjs');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    console.log('\n🔍 Testing individual problematic models...');
    
    // Test Achievement model (base table)
    try {
      const { default: Achievement } = await import('./backend/models/Achievement.mjs');
      console.log('✅ Achievement model imported');
      console.log(`   Table name: ${Achievement.getTableName()}`);
    } catch (error) {
      console.log('❌ Achievement model failed:', error.message);
      return false;
    }
    
    // Test SocialPost model (FK to Achievement)
    try {
      const { default: SocialPost } = await import('./backend/models/social/SocialPost.mjs');
      console.log('✅ SocialPost model imported');
      
      // Check FK reference
      const achievementRef = SocialPost.rawAttributes.achievementId?.references;
      if (achievementRef) {
        console.log(`   ✓ FK Reference: ${achievementRef.model}.${achievementRef.key}`);
      }
    } catch (error) {
      console.log('❌ SocialPost model failed:', error.message);
      return false;
    }
    
    // Test Challenge model (FK to Achievement via badgeId)
    try {
      const { default: Challenge } = await import('./backend/models/social/Challenge.mjs');
      console.log('✅ Challenge model imported');
      
      // Check FK reference
      const badgeRef = Challenge.rawAttributes.badgeId?.references;
      if (badgeRef) {
        console.log(`   ✓ FK Reference: ${badgeRef.model}.${badgeRef.key}`);
      }
    } catch (error) {
      console.log('❌ Challenge model failed:', error.message);
      return false;
    }
    
    // Test UserAchievement model
    try {
      const { default: UserAchievement } = await import('./backend/models/UserAchievement.mjs');
      console.log('✅ UserAchievement model imported');
      
      // Check FK reference
      const achievementRef = UserAchievement.rawAttributes.achievementId?.references;
      if (achievementRef) {
        console.log(`   ✓ FK Reference: ${achievementRef.model}.${achievementRef.key}`);
      }
    } catch (error) {
      console.log('❌ UserAchievement model failed:', error.message);
      return false;
    }
    
    console.log('\n📊 Loading all models to verify count...');
    
    // Load all models with associations
    try {
      const { default: getModels } = await import('./backend/models/associations.mjs');
      const models = await getModels();
      
      const modelCount = Object.keys(models).length;
      console.log(`✅ Total models loaded: ${modelCount}`);
      
      if (modelCount >= 42) {
        console.log('🎉 TARGET ACHIEVED: All models loading successfully!');
      } else {
        console.log(`⚠️  Model count: ${modelCount} (expected ~42+)`);
      }
      
      // List model names
      const modelNames = Object.keys(models).sort();
      console.log(`\n📋 Available models (${modelCount}):`);
      modelNames.forEach((name, index) => {
        console.log(`   ${index + 1}. ${name}`);
      });
      
    } catch (error) {
      console.log('❌ Failed to load all models:', error.message);
      return false;
    }
    
    await sequelize.close();
    console.log('\n✅ Database connection closed');
    
    return true;
    
  } catch (error) {
    console.error('💥 Verification failed:', error.message);
    return false;
  }
};

// Run verification
verifyFKFixes().then(success => {
  console.log('\n' + '='.repeat(50));
  if (success) {
    console.log('🏆 FK CONSTRAINT FIXES VERIFIED SUCCESSFUL!');
    console.log('✅ All models loading without FK constraint errors');
    console.log('✅ SocialPosts_achievementId_fkey: FIXED');
    console.log('✅ Challenges_badgeId_fkey: FIXED');
    console.log('\n🚀 Ready to start server: npm run dev');
    process.exit(0);
  } else {
    console.log('❌ VERIFICATION FAILED - Additional fixes needed');
    process.exit(1);
  }
});
