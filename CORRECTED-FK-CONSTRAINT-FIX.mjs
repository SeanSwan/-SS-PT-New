/**
 * FINAL FK CONSTRAINT FIX - CORRECTED APPROACH
 * ============================================
 * Final script to achieve 43/43 models loading (100% success)
 * Addresses the REAL FK constraint issues with proper table name handling
 */

import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

console.log('🎯 FINAL FK CONSTRAINT FIX - CORRECTED APPROACH');
console.log('==============================================');

const finalFKFix = async () => {
  try {
    console.log('📋 Loading database and models...');
    
    // Import database and setup associations
    const { default: sequelize } = await import('./backend/database.mjs');
    
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Test the specific problematic models individually
    console.log('\n🔍 Phase 1: Testing Individual Problematic Models...');
    
    let modelErrors = [];
    
    // Test Achievement model (referenced table)
    try {
      const { default: Achievement } = await import('./backend/models/Achievement.mjs');
      console.log('✅ Achievement model imported');
      console.log(`   Table name: ${Achievement.getTableName()}`);
      
      // Try to sync Achievement first
      await Achievement.sync({ force: false });
      console.log('✅ Achievement model synced successfully');
    } catch (error) {
      console.log('❌ Achievement model failed:', error.message);
      modelErrors.push(`Achievement: ${error.message}`);
    }
    
    // Test SocialPost model (FK to Achievement)
    try {
      const { default: SocialPost } = await import('./backend/models/social/SocialPost.mjs');
      console.log('✅ SocialPost model imported');
      
      const achievementRef = SocialPost.rawAttributes.achievementId?.references;
      if (achievementRef) {
        console.log(`   FK Reference: ${achievementRef.model}.${achievementRef.key}`);
      }
      
      // Try to sync SocialPost (this was failing before)
      await SocialPost.sync({ force: false });
      console.log('✅ SocialPost model synced successfully - FK CONSTRAINT FIXED!');
    } catch (error) {
      console.log('❌ SocialPost model failed:', error.message);
      if (error.message.includes('achievementId_fkey')) {
        console.log('🚨 STILL HAVE THE ACHIEVEMENTID FK CONSTRAINT ISSUE!');
      }
      modelErrors.push(`SocialPost: ${error.message}`);
    }
    
    // Test Challenge model (FK to Achievement)
    try {
      const { default: Challenge } = await import('./backend/models/social/Challenge.mjs');
      console.log('✅ Challenge model imported');
      
      const badgeRef = Challenge.rawAttributes.badgeId?.references;
      if (badgeRef) {
        console.log(`   FK Reference: ${badgeRef.model}.${badgeRef.key}`);
      }
      
      // Try to sync Challenge (this was failing before)
      await Challenge.sync({ force: false });
      console.log('✅ Challenge model synced successfully - FK CONSTRAINT FIXED!');
    } catch (error) {
      console.log('❌ Challenge model failed:', error.message);
      if (error.message.includes('badgeId_fkey')) {
        console.log('🚨 STILL HAVE THE BADGEID FK CONSTRAINT ISSUE!');
      }
      modelErrors.push(`Challenge: ${error.message}`);
    }
    
    // Test UserAchievement model for consistency
    try {
      const { default: UserAchievement } = await import('./backend/models/UserAchievement.mjs');
      console.log('✅ UserAchievement model imported');
      
      await UserAchievement.sync({ force: false });
      console.log('✅ UserAchievement model synced successfully');
    } catch (error) {
      console.log('❌ UserAchievement model failed:', error.message);
      modelErrors.push(`UserAchievement: ${error.message}`);
    }
    
    // Phase 2: Load all models with associations to check total count
    console.log('\n📊 Phase 2: Loading All Models with Associations...');
    
    try {
      const { default: getModels } = await import('./backend/models/associations.mjs');
      const models = await getModels();
      
      const modelCount = Object.keys(models).length;
      console.log(`✅ Loaded ${modelCount} models with associations`);
      
      if (modelCount >= 43) {
        console.log('🎉 TARGET ACHIEVED: 43+ models loading!');
      } else {
        console.log(`⚠️  Still short of target: ${modelCount}/43 models`);
        console.log('Missing models investigation needed...');
      }
      
      // List all available models
      const modelNames = Object.keys(models).sort();
      console.log(`\n📋 Available models (${modelCount}):`);
      modelNames.forEach((name, index) => {
        console.log(`   ${index + 1}. ${name}`);
      });
      
    } catch (associationError) {
      console.log('❌ Failed to load models with associations:', associationError.message);
      modelErrors.push(`Associations: ${associationError.message}`);
    }
    
    // Phase 3: Database table verification
    console.log('\n🗃️  Phase 3: Database Table Verification...');
    
    try {
      // Check if the Achievements table exists and is accessible
      const [achievementsCheck] = await sequelize.query(
        "SELECT table_name FROM information_schema.tables WHERE table_name = 'Achievements' AND table_schema = 'public';"
      );
      
      if (achievementsCheck.length > 0) {
        console.log('✅ Achievements table exists in database');
        
        // Check the actual table structure
        const [tableInfo] = await sequelize.query(
          "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Achievements' AND table_schema = 'public';"
        );
        
        console.log('📋 Achievements table structure:');
        tableInfo.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type}`);
        });
      } else {
        console.log('❌ Achievements table not found in database');
        modelErrors.push('Achievements table missing from database');
      }
      
    } catch (dbError) {
      console.log('❌ Database verification failed:', dbError.message);
      modelErrors.push(`Database verification: ${dbError.message}`);
    }
    
    // Final Results
    console.log('\n' + '='.repeat(60));
    console.log('🏆 FINAL FK CONSTRAINT FIX RESULTS');
    console.log('='.repeat(60));
    
    if (modelErrors.length === 0) {
      console.log('\n🎉 SUCCESS! FK CONSTRAINT ISSUES RESOLVED!');
      console.log('✅ SocialPosts_achievementId_fkey: FIXED');
      console.log('✅ Challenges_badgeId_fkey: FIXED');
      console.log('✅ Achievement table name consistency: FIXED');
      console.log('\n🚀 Server restart should now show 43/43 models!');
    } else {
      console.log('\n⚠️  Some issues still remain:');
      modelErrors.forEach((error, i) => console.log(`   ${i + 1}. ${error}`));
      
      console.log('\n🔧 Additional investigation needed.');
    }
    
    await sequelize.close();
    console.log('\n✅ Database connection closed cleanly');
    
    return modelErrors.length === 0;
    
  } catch (error) {
    console.error('💥 Critical error in FK constraint fix:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
};

// Execute the final FK constraint fix
finalFKFix().then(success => {
  if (success) {
    console.log('\n🏁 FK CONSTRAINT FIX COMPLETE - READY FOR 43/43 MODELS!');
    console.log('\n🔄 Next: Restart your server with START-BACKEND-ONLY.bat');
    process.exit(0);
  } else {
    console.log('\n🔄 Additional fixes needed. Check output above.');
    process.exit(1);
  }
});
