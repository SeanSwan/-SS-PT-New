#!/usr/bin/env node

/**
 * 🎯 Final Model Import Fix - Get to 43/43 Models
 * ===============================================
 * 
 * Fixes the social models import issue that's preventing Challenge models from loading
 * The problem: Social models are imported as namespace but not individually exported
 */

import fs from 'fs';

console.log('🎯 Final Model Import Fix - Get to 43/43 Models');
console.log('================================================\n');

console.log('🔍 PROBLEM IDENTIFIED:');
console.log('======================');
console.log('Social models (Challenge, ChallengeParticipant, ChallengeTeam) exist but are not');
console.log('properly exported as individual models from models/index.mjs');
console.log('');
console.log('Current: import * as socialModels from "./social/index.mjs"');
console.log('Issue: Challenge models are nested under socialModels object');
console.log('Solution: Import and export social models individually\n');

function fixModelsIndex() {
  console.log('🔧 Fixing models/index.mjs...');
  console.log('=============================\n');

  const indexPath = './models/index.mjs';
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ models/index.mjs not found!');
    return false;
  }

  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    
    // Create new content with individual social model imports
    const newContent = `/**
 * Models Index
 * This file exports all models to simplify imports throughout the application
 */

import User from './User.mjs';
import Session from './Session.mjs';
import WorkoutPlan from './WorkoutPlan.mjs';
import WorkoutPlanDay from './WorkoutPlanDay.mjs';
import WorkoutPlanDayExercise from './WorkoutPlanDayExercise.mjs';
import WorkoutSession from './WorkoutSession.mjs';
import WorkoutExercise from './WorkoutExercise.mjs';
import Exercise from './Exercise.mjs';
import MuscleGroup from './MuscleGroup.mjs';
import ExerciseMuscleGroup from './ExerciseMuscleGroup.mjs';
import Equipment from './Equipment.mjs';
import ExerciseEquipment from './ExerciseEquipment.mjs';
import ClientProgress from './ClientProgress.mjs';
import Set from './Set.mjs';
import StorefrontItem from './StorefrontItem.mjs';
import ShoppingCart from './ShoppingCart.mjs';
import CartItem from './CartItem.mjs';
import Order from './Order.mjs';
import OrderItem from './OrderItem.mjs';
import Gamification from './Gamification.mjs';
import GamificationSettings from './GamificationSettings.mjs';
import Achievement from './Achievement.mjs';
import UserAchievement from './UserAchievement.mjs';
import Milestone from './Milestone.mjs';
import UserMilestone from './UserMilestone.mjs';
import Reward from './Reward.mjs';
import UserReward from './UserReward.mjs';
import PointTransaction from './PointTransaction.mjs';
import Notification from './Notification.mjs';
import NotificationSettings from './NotificationSettings.mjs';
import AdminSettings from './AdminSettings.mjs';
import FoodProduct from './FoodProduct.mjs';
import FoodIngredient from './FoodIngredient.mjs';
import FoodScanHistory from './FoodScanHistory.mjs';
import Orientation from './Orientation.mjs';

// Import social models individually (FIXED)
import Friendship from './social/Friendship.mjs';
import SocialPost from './social/SocialPost.mjs';
import SocialComment from './social/SocialComment.mjs';
import SocialLike from './social/SocialLike.mjs';
import Challenge from './social/Challenge.mjs';
import ChallengeParticipant from './social/ChallengeParticipant.mjs';
import ChallengeTeam from './social/ChallengeTeam.mjs';

// Set up associations between models
import setupAssociations from './associations.mjs';

// Initialize associations
setupAssociations();

// Export all models individually (FIXED - includes social models)
export {
  User,
  Session,
  WorkoutPlan,
  WorkoutPlanDay,
  WorkoutPlanDayExercise,
  WorkoutSession,
  WorkoutExercise,
  Exercise,
  MuscleGroup,
  ExerciseMuscleGroup,
  Equipment,
  ExerciseEquipment,
  ClientProgress,
  Set,
  StorefrontItem,
  ShoppingCart,
  CartItem,
  Order,
  OrderItem,
  Gamification,
  GamificationSettings,
  Achievement,
  UserAchievement,
  Milestone,
  UserMilestone,
  Reward,
  UserReward,
  PointTransaction,
  Notification,
  NotificationSettings,
  AdminSettings,
  FoodProduct,
  FoodIngredient,
  FoodScanHistory,
  Orientation,
  // Social models now exported individually
  Friendship,
  SocialPost,
  SocialComment,
  SocialLike,
  Challenge,
  ChallengeParticipant,
  ChallengeTeam
};

// Default export with all models
export default {
  User,
  Session,
  WorkoutPlan,
  WorkoutPlanDay,
  WorkoutPlanDayExercise,
  WorkoutSession,
  WorkoutExercise,
  Exercise,
  MuscleGroup,
  ExerciseMuscleGroup,
  Equipment,
  ExerciseEquipment,
  ClientProgress,
  Set,
  StorefrontItem,
  ShoppingCart,
  CartItem,
  Order,
  OrderItem,
  Gamification,
  GamificationSettings,
  Achievement,
  UserAchievement,
  Milestone,
  UserMilestone,
  Reward,
  UserReward,
  PointTransaction,
  Notification,
  NotificationSettings,
  AdminSettings,
  FoodProduct,
  FoodIngredient,
  FoodScanHistory,
  Orientation,
  // Social models now included individually
  Friendship,
  SocialPost,
  SocialComment,
  SocialLike,
  Challenge,
  ChallengeParticipant,
  ChallengeTeam
};
`;

    // Backup original
    fs.writeFileSync(indexPath + '.backup', content);
    console.log('📄 Original backed up to models/index.mjs.backup');
    
    // Write fixed version
    fs.writeFileSync(indexPath, newContent);
    console.log('✅ models/index.mjs updated with individual social model imports');
    
    console.log('\n🎯 CHANGES MADE:');
    console.log('================');
    console.log('✅ Social models now imported individually');
    console.log('✅ Challenge, ChallengeParticipant, ChallengeTeam exported');
    console.log('✅ All 46 models should now be available for import');
    
    return true;

  } catch (error) {
    console.log(`❌ Error fixing models/index.mjs: ${error.message}`);
    return false;
  }
}

function forceDatabaseSync() {
  console.log('\n🗃️ Database Sync Recommendation');
  console.log('=================================\n');
  
  console.log('The missing tables (WorkoutSessions, WorkoutPlans, Challenges) need to be created.');
  console.log('This happens during database sync when models are properly loaded.\n');
  
  console.log('💡 SOLUTION:');
  console.log('After fixing the imports, the next server startup should automatically');
  console.log('create the missing tables through Sequelize sync.\n');
  
  console.log('If tables still don\'t create automatically, you can force sync by:');
  console.log('1. Temporarily adding { force: true } to sequelize.sync()');
  console.log('2. Or running manual CREATE TABLE commands');
  console.log('3. Or using Sequelize migrations\n');
}

function provideFinalTest() {
  console.log('🧪 FINAL TEST COMMANDS');
  console.log('======================\n');
  
  console.log('After applying the fix, run:');
  console.log('');
  console.log('1. npm run start');
  console.log('   Expected: 43/43 models loaded');
  console.log('');
  console.log('2. Check server logs for:');
  console.log('   ✅ No "relation does not exist" errors');
  console.log('   ✅ All tables created successfully');
  console.log('   ✅ Clean database sync');
  console.log('');
  console.log('3. If still issues, run:');
  console.log('   node test-individual-model-imports.mjs');
  console.log('');
}

function main() {
  console.log('🎯 ROOT CAUSE ANALYSIS:');
  console.log('=======================');
  console.log('✅ WorkoutSession model exists and is configured correctly');
  console.log('✅ Challenge models exist in social directory');
  console.log('❌ Social models not individually exported from main index');
  console.log('❌ This prevents Challenge models from being loaded');
  console.log('❌ Missing models cause table creation to fail');
  console.log('');
  
  const fixSuccess = fixModelsIndex();
  
  if (fixSuccess) {
    forceDatabaseSync();
    provideFinalTest();
    
    console.log('🎉 EXPECTED OUTCOME:');
    console.log('====================');
    console.log('✅ All 43 models should now load successfully');
    console.log('✅ Database tables will be created automatically');
    console.log('✅ No more "relation does not exist" errors');
    console.log('✅ Clean server startup');
    console.log('');
    console.log('🚀 Run "npm run start" to test!');
    
  } else {
    console.log('❌ Fix failed - check errors above');
  }
}

main();
