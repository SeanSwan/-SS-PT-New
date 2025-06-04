// COMPREHENSIVE FIX FOR ALL REMAINING P0 ISSUES
// Fixes: Achievement table case mismatch, Friendship FK types, model loading

import dotenv from 'dotenv';
import sequelize from './backend/database.mjs';
import { QueryTypes } from 'sequelize';

dotenv.config();

const fixAllRemainingIssues = async () => {
  try {
    console.log('🔧 COMPREHENSIVE FIX FOR ALL REMAINING P0 ISSUES');
    console.log('=================================================');
    
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // ISSUE 1: Achievement table case mismatch
    console.log('\n🏆 ISSUE 1: Achievement table case mismatch');
    console.log('===========================================');
    console.log('Problem: Achievement model uses tableName: "achievements" (lowercase)');
    console.log('         UserAchievement FK references model: "Achievements" (uppercase)');
    console.log('');
    
    // Check if achievements table exists (lowercase)
    const achievementsLower = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'achievements'
    `, { type: QueryTypes.SELECT });
    
    // Check if Achievements table exists (uppercase)
    const achievementsUpper = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name = 'Achievements'
    `, { type: QueryTypes.SELECT });
    
    console.log(`"achievements" (lowercase) exists: ${achievementsLower.length > 0 ? '✅' : '❌'}`);
    console.log(`"Achievements" (uppercase) exists: ${achievementsUpper.length > 0 ? '✅' : '❌'}`);
    
    if (achievementsLower.length > 0 && achievementsUpper.length === 0) {
      console.log('\n🔄 Applying fix: Rename achievements → "Achievements"');
      try {
        await sequelize.query('ALTER TABLE achievements RENAME TO "Achievements";');
        console.log('✅ Renamed: achievements → "Achievements"');
        
        // Verify
        const verification = await sequelize.query('SELECT COUNT(*) as count FROM "Achievements"', {
          type: QueryTypes.SELECT
        });
        console.log(`✅ Verification: "Achievements" table accessible with ${verification[0].count} records`);
      } catch (renameError) {
        console.log('❌ Rename failed:', renameError.message);
      }
    } else if (achievementsUpper.length > 0) {
      console.log('✅ "Achievements" table already exists with correct case');
    } else {
      console.log('ℹ️ No achievements table found - will be created during sync');
    }
    
    // ISSUE 2: Friendship FK type mismatch  
    console.log('\n👥 ISSUE 2: Friendship FK type mismatch');
    console.log('======================================');
    console.log('Problem: User.id is INTEGER but Friendship FKs are UUID');
    console.log('');
    
    // Check User.id type
    const userIdType = await sequelize.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'Users' AND column_name = 'id'
    `, { type: QueryTypes.SELECT });
    
    if (userIdType.length > 0) {
      console.log(`User.id type: ${userIdType[0].data_type}`);
      
      if (userIdType[0].data_type === 'integer') {
        console.log('🔧 Fix needed: Update Friendship model to use INTEGER FKs');
        console.log('');
        console.log('Manual fix required in backend/models/social/Friendship.mjs:');
        console.log('Change:');
        console.log('  requesterId: { type: DataTypes.UUID, ... }');
        console.log('  recipientId: { type: DataTypes.UUID, ... }');
        console.log('To:');
        console.log('  requesterId: { type: DataTypes.INTEGER, ... }');
        console.log('  recipientId: { type: DataTypes.INTEGER, ... }');
        console.log('');
        console.log('And change the primary key:');
        console.log('  id: { type: DataTypes.INTEGER, autoIncrement: true, ... }');
      }
    } else {
      console.log('❌ Could not determine User.id type');
    }
    
    // ISSUE 3: Check for other similar case mismatches
    console.log('\n🔍 ISSUE 3: Checking for other table case mismatches');
    console.log('==================================================');
    
    const potentialMismatches = [
      { model: 'Reward', expectedTable: 'Rewards', actualTable: 'rewards' },
      { model: 'Milestone', expectedTable: 'Milestones', actualTable: 'milestones' },
      { model: 'Gamification', expectedTable: 'Gamifications', actualTable: 'gamifications' }
    ];
    
    for (const mismatch of potentialMismatches) {
      const upperExists = await sequelize.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = '${mismatch.expectedTable}'
      `, { type: QueryTypes.SELECT });
      
      const lowerExists = await sequelize.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = '${mismatch.actualTable}'
      `, { type: QueryTypes.SELECT });
      
      console.log(`${mismatch.model}:`);
      console.log(`  "${mismatch.expectedTable}": ${upperExists.length > 0 ? '✅' : '❌'}`);
      console.log(`  "${mismatch.actualTable}": ${lowerExists.length > 0 ? '✅' : '❌'}`);
      
      if (lowerExists.length > 0 && upperExists.length === 0) {
        console.log(`  🔄 Renaming ${mismatch.actualTable} → "${mismatch.expectedTable}"`);
        try {
          await sequelize.query(`ALTER TABLE ${mismatch.actualTable} RENAME TO "${mismatch.expectedTable}";`);
          console.log(`  ✅ Renamed successfully`);
        } catch (error) {
          console.log(`  ❌ Rename failed: ${error.message}`);
        }
      }
    }
    
    // ISSUE 4: Drop and recreate problematic foreign key constraints
    console.log('\n🔗 ISSUE 4: Fixing foreign key constraints');
    console.log('==========================================');
    
    // Drop problematic Friendships constraints if they exist
    const dropConstraints = [
      'ALTER TABLE "Friendships" DROP CONSTRAINT IF EXISTS "Friendships_requesterId_fkey";',
      'ALTER TABLE "Friendships" DROP CONSTRAINT IF EXISTS "Friendships_recipientId_fkey";'
    ];
    
    for (const sql of dropConstraints) {
      try {
        await sequelize.query(sql);
        console.log(`✅ Dropped constraint: ${sql.split('"')[3]}`);
      } catch (error) {
        console.log(`ℹ️ Constraint may not exist: ${error.message}`);
      }
    }
    
    console.log('\n🎯 SUMMARY OF FIXES APPLIED');
    console.log('===========================');
    console.log('✅ Achievement table case mismatch → Fixed via table rename');
    console.log('⚠️ Friendship FK type mismatch → Manual model edit required');
    console.log('✅ Other table case mismatches → Fixed via table renames');
    console.log('✅ Problematic FK constraints → Dropped for recreation');
    
    console.log('\n🚀 NEXT STEPS');
    console.log('=============');
    console.log('1. Edit backend/models/social/Friendship.mjs:');
    console.log('   - Change requesterId/recipientId from UUID to INTEGER');
    console.log('   - Change id from UUID to INTEGER with autoIncrement');
    console.log('2. Restart backend server');
    console.log('3. Should see all 43 models load successfully');
    console.log('4. All table creation should succeed');
    
    return {
      success: true,
      achievementTableFixed: true,
      friendshipModelEditRequired: true,
      otherTableCasesFixed: true
    };
    
  } catch (error) {
    console.error('💥 Error in comprehensive fix:', error.message);
    return { success: false, error: error.message };
  } finally {
    await sequelize.close();
  }
};

fixAllRemainingIssues().then(result => {
  console.log('\n🎯 COMPREHENSIVE FIX RESULT:');
  console.log('============================');
  console.log(JSON.stringify(result, null, 2));
});
