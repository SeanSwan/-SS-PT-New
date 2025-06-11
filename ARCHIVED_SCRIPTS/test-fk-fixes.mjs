/**
 * Test FK Constraint Fixes
 * Tests if the table name corrections resolve the 2 remaining FK constraint issues
 */

import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

console.log('🔧 TESTING FK CONSTRAINT FIXES');
console.log('==============================');

const testFKConstraintFixes = async () => {
  try {
    // Import the database connection
    const { default: sequelize } = await import('./backend/database.mjs');
    
    console.log('✅ Database connection imported');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database authentication successful');
    
    // Import the fixed models
    console.log('\n📋 Importing Fixed Models...');
    const { default: Achievement } = await import('./backend/models/Achievement.mjs');
    const { default: SocialPost } = await import('./backend/models/social/SocialPost.mjs');
    const { default: Challenge } = await import('./backend/models/social/Challenge.mjs');
    const { default: UserAchievement } = await import('./backend/models/UserAchievement.mjs');
    
    console.log('✅ All models imported successfully');
    
    // Check table names and FK references
    console.log('\n🔍 Checking Table Names and FK References...');
    console.log('Achievement tableName:', Achievement.getTableName());
    console.log('SocialPost achievementId reference:', SocialPost.rawAttributes.achievementId?.references);
    console.log('Challenge badgeId reference:', Challenge.rawAttributes.badgeId?.references);
    console.log('UserAchievement achievementId reference:', UserAchievement.rawAttributes.achievementId?.references);
    
    // Test Model Sync - This is where FK constraints are created
    console.log('\n🔄 Testing Model Sync (FK Constraint Creation)...');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Sync Achievement first (referenced table)
    try {
      await Achievement.sync({ force: false });
      console.log('✅ Achievement model synced successfully');
      successCount++;
    } catch (error) {
      console.log('❌ Achievement sync failed:', error.message);
      errors.push(`Achievement: ${error.message}`);
      errorCount++;
    }
    
    // Sync UserAchievement (has FK to Achievement)
    try {
      await UserAchievement.sync({ force: false });
      console.log('✅ UserAchievement model synced successfully');
      successCount++;
    } catch (error) {
      console.log('❌ UserAchievement sync failed:', error.message);
      errors.push(`UserAchievement: ${error.message}`);
      errorCount++;
    }
    
    // Sync SocialPost (has FK to Achievement) - THIS WAS FAILING BEFORE
    try {
      await SocialPost.sync({ force: false });
      console.log('✅ SocialPost model synced successfully (FK CONSTRAINT FIXED!)');
      successCount++;
    } catch (error) {
      console.log('❌ SocialPost sync failed:', error.message);
      if (error.message.includes('achievementId_fkey')) {
        console.log('🚨 STILL HAVE THE ACHIEVEMENTID FK CONSTRAINT ISSUE!');
      }
      errors.push(`SocialPost: ${error.message}`);
      errorCount++;
    }
    
    // Sync Challenge (has FK to Achievement) - THIS WAS FAILING BEFORE
    try {
      await Challenge.sync({ force: false });
      console.log('✅ Challenge model synced successfully (FK CONSTRAINT FIXED!)');
      successCount++;
    } catch (error) {
      console.log('❌ Challenge sync failed:', error.message);
      if (error.message.includes('badgeId_fkey')) {
        console.log('🚨 STILL HAVE THE BADGEID FK CONSTRAINT ISSUE!');
      }
      errors.push(`Challenge: ${error.message}`);
      errorCount++;
    }
    
    // Final Results
    console.log('\n' + '='.repeat(50));
    console.log('🎯 FK CONSTRAINT FIX TEST RESULTS');
    console.log('='.repeat(50));
    
    if (errorCount === 0) {
      console.log('🎉 ALL FK CONSTRAINTS FIXED! 43/43 MODELS SHOULD NOW LOAD!');
      console.log('✅ SocialPosts_achievementId_fkey: RESOLVED');
      console.log('✅ Challenges_badgeId_fkey: RESOLVED');
      console.log('✅ Ready to achieve 100% model loading success!');
    } else {
      console.log(`⚠️  ${errorCount} FK constraint issues still remain:`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log(`\n📈 Fix success rate: ${successCount}/${successCount + errorCount} models synced successfully`);
    
    await sequelize.close();
    console.log('✅ Database connection closed');
    
    return errorCount === 0;
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
};

// Run the test
testFKConstraintFixes().then(success => {
  if (success) {
    console.log('\\n🚀 FK CONSTRAINT FIXES SUCCESSFUL! You can now restart your server.');
    process.exit(0);
  } else {
    console.log('\\n🔧 Additional fixes may be needed. Check the errors above.');
    process.exit(1);
  }
});
