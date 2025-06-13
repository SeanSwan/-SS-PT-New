/**
 * Models Index
 * This file exports all models to simplify imports throughout the application
 * 
 * FIXED: Removed duplicate association setup to prevent circular dependencies.
 * Association setup is handled properly by associations.mjs with singleton pattern.
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

// Import social models individually
import Friendship from './social/Friendship.mjs';
import SocialPost from './social/SocialPost.mjs';
import SocialComment from './social/SocialComment.mjs';
import SocialLike from './social/SocialLike.mjs';
import Challenge from './social/Challenge.mjs';
import ChallengeParticipant from './social/ChallengeParticipant.mjs';
import ChallengeTeam from './social/ChallengeTeam.mjs';

// NOTE: Association setup is handled by associations.mjs with proper singleton pattern
// Removed duplicate setup to prevent circular dependencies

// Export all models individually
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
  // Social models
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
  // Social models
  Friendship,
  SocialPost,
  SocialComment,
  SocialLike,
  Challenge,
  ChallengeParticipant,
  ChallengeTeam
};
