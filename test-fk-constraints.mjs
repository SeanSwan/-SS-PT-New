/**
 * Test FK Constraint Issues
 * Tests the specific FK constraint issues mentioned in the session report
 */

import dotenv from 'dotenv';
dotenv.config({ path: './backend/.env' });

console.log('🔍 TESTING FK CONSTRAINT ISSUES');
console.log('================================');

const testFKConstraints = async () => {
  try {
    // Import the database connection
    const { default: sequelize } = await import('./backend/database.mjs');
    
    console.log('✅ Database connection imported');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database authentication successful');
    
    // Test 1: Check Achievement model
    console.log('\n📋 TEST 1: Achievement Model...');
    const { default: Achievement } = await import('./backend/models/Achievement.mjs');
    console.log('✅ Achievement model imported');
    console.log('Achievement ID type:', Achievement.rawAttributes.id.type.toString());
    
    // Test 2: Check SocialPost model
    console.log('\n📋 TEST 2: SocialPost Model...');
    const { default: SocialPost } = await import('./backend/models/social/SocialPost.mjs');
    console.log('✅ SocialPost model imported');
    
    if (SocialPost.rawAttributes.achievementId) {
      console.log('SocialPost achievementId type:', SocialPost.rawAttributes.achievementId.type.toString());
      console.log('SocialPost achievementId references:', SocialPost.rawAttributes.achievementId.references);
    } else {
      console.log('❌ SocialPost achievementId field not found');
    }
    
    // Test 3: Check Challenge model
    console.log('\n📋 TEST 3: Challenge Model...');
    const { default: Challenge } = await import('./backend/models/social/Challenge.mjs');
    console.log('✅ Challenge model imported');
    
    if (Challenge.rawAttributes.badgeId) {
      console.log('Challenge badgeId type:', Challenge.rawAttributes.badgeId.type.toString());
      console.log('Challenge badgeId references:', Challenge.rawAttributes.badgeId.references);
    } else {
      console.log('❌ Challenge badgeId field not found');
    }
    
    // Test 4: Try to sync models and see what error occurs
    console.log('\n📋 TEST 4: Attempting Model Sync...');
    
    try {
      // Sync only the Achievement model first
      await Achievement.sync({ force: false });
      console.log('✅ Achievement model synced successfully');
      
      // Try to sync SocialPost
      await SocialPost.sync({ force: false });
      console.log('✅ SocialPost model synced successfully');
      
      // Try to sync Challenge
      await Challenge.sync({ force: false });
      console.log('✅ Challenge model synced successfully');
      
    } catch (syncError) {
      console.log('❌ Sync error:', syncError.message);
      
      // Check if it's the specific FK constraint error
      if (syncError.message.includes('achievementId_fkey') || syncError.message.includes('badgeId_fkey')) {
        console.log('🎯 FOUND THE FK CONSTRAINT ISSUE!');
        console.log('Error details:', syncError.original?.detail || 'No additional details');
      }
    }
    
    // Test 5: Check if tables exist
    console.log('\n📋 TEST 5: Checking Table Existence...');
    
    try {
      const [achievementsExist] = await sequelize.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Achievements');"
      );
      console.log('Achievements table exists:', achievementsExist[0].exists);
      
      const [socialPostsExist] = await sequelize.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'SocialPosts');"
      );
      console.log('SocialPosts table exists:', socialPostsExist[0].exists);
      
      const [challengesExist] = await sequelize.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Challenges');"
      );
      console.log('Challenges table exists:', challengesExist[0].exists);
      
    } catch (queryError) {
      console.log('❌ Query error:', queryError.message);
    }
    
    // Test 6: Check existing FK constraints
    console.log('\n📋 TEST 6: Checking Existing FK Constraints...');
    
    try {
      const [constraints] = await sequelize.query(`
        SELECT 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
        FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE 
          tc.constraint_type = 'FOREIGN KEY' 
          AND (
            tc.table_name IN ('SocialPosts', 'Challenges') 
            OR ccu.table_name = 'Achievements'
          );
      `);
      
      console.log('🔗 Existing FK constraints:');
      constraints.forEach(constraint => {
        console.log(`  ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      });
      
    } catch (constraintError) {
      console.log('❌ Constraint query error:', constraintError.message);
    }
    
    await sequelize.close();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('💥 Test error:', error.message);
    console.error('Stack:', error.stack);
  }
};

testFKConstraints();
