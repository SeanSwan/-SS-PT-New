  // Food Scanner Models
  FoodIngredient,
  FoodProduct,
  FoodScanHistory,/**
 * Model Associations
 * =================
 * This file defines all associations between models in the system.
 * 
 * Enhanced for the workout tracking system with normalized data models:
 * - Added Set associations to WorkoutExercise
 * - Added MuscleGroup and Equipment associations to Exercise
 * - Added WorkoutPlanDay and WorkoutPlanDayExercise associations
 * - Added E-Commerce models (Order, OrderItem, StorefrontItem, ShoppingCart, CartItem)
 */

import User from './User.mjs';
import Exercise from './Exercise.mjs';
import WorkoutSession from './WorkoutSession.mjs';
import WorkoutExercise from './WorkoutExercise.mjs';
import WorkoutPlan from './WorkoutPlan.mjs';
import ClientProgress from './ClientProgress.mjs';
import Gamification from './Gamification.mjs';
import Achievement from './Achievement.mjs';
import Set from './Set.mjs';
import MuscleGroup from './MuscleGroup.mjs';
import ExerciseMuscleGroup from './ExerciseMuscleGroup.mjs';
import Equipment from './Equipment.mjs';
import ExerciseEquipment from './ExerciseEquipment.mjs';
import WorkoutPlanDay from './WorkoutPlanDay.mjs';
import WorkoutPlanDayExercise from './WorkoutPlanDayExercise.mjs';
import GamificationSettings from './GamificationSettings.mjs';
import UserAchievement from './UserAchievement.mjs';
import UserReward from './UserReward.mjs';
import UserMilestone from './UserMilestone.mjs';
import Reward from './Reward.mjs';
import Milestone from './Milestone.mjs';
import PointTransaction from './PointTransaction.mjs';

// E-Commerce Models
import StorefrontItem from './StorefrontItem.mjs';
import ShoppingCart from './ShoppingCart.mjs';
import CartItem from './CartItem.mjs';
import Order from './Order.mjs';
import OrderItem from './OrderItem.mjs';

// Food Scanner Models
import FoodIngredient from './FoodIngredient.mjs';
import FoodProduct from './FoodProduct.mjs';
import FoodScanHistory from './FoodScanHistory.mjs';

// Social Models
import { 
  Challenge, 
  ChallengeTeam, 
  ChallengeParticipant, 
  Friendship, 
  SocialPost, 
  SocialComment, 
  SocialLike 
} from './social/index.mjs';

// Define associations
const setupAssociations = () => {
  // User Associations
  // ----------------
  // A user can create many workout sessions and plans
  User.hasMany(WorkoutSession, { foreignKey: 'userId', as: 'workoutSessions' });
  User.hasMany(WorkoutPlan, { foreignKey: 'trainerId', as: 'createdWorkoutPlans' });
  User.hasMany(WorkoutPlan, { foreignKey: 'clientId', as: 'assignedWorkoutPlans' });
  User.hasOne(ClientProgress, { foreignKey: 'userId', as: 'progress' });
  User.hasOne(Gamification, { foreignKey: 'userId', as: 'gamification' });
  
  // User to achievements (many-to-many through UserAchievements)
  User.belongsToMany(Achievement, { 
    through: 'UserAchievements',
    foreignKey: 'userId',
    otherKey: 'achievementId',
    as: 'achievements'
  });
  
  // Exercise Associations
  // --------------------
  // Exercise normalization
  Exercise.belongsToMany(MuscleGroup, { 
    through: ExerciseMuscleGroup,
    foreignKey: 'exerciseId',
    otherKey: 'muscleGroupId',
    as: 'muscleGroups'
  });
  
  Exercise.belongsToMany(Equipment, { 
    through: ExerciseEquipment,
    foreignKey: 'exerciseId',
    otherKey: 'equipmentId',
    as: 'equipment'
  });
  
  MuscleGroup.belongsToMany(Exercise, { 
    through: ExerciseMuscleGroup,
    foreignKey: 'muscleGroupId',
    otherKey: 'exerciseId',
    as: 'exercises'
  });
  
  Equipment.belongsToMany(Exercise, { 
    through: ExerciseEquipment,
    foreignKey: 'equipmentId',
    otherKey: 'exerciseId',
    as: 'exercises'
  });
  
  // Workout Session Associations
  // ---------------------------
  WorkoutSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  WorkoutSession.belongsTo(WorkoutPlan, { foreignKey: 'workoutPlanId', as: 'workoutPlan' });
  WorkoutSession.hasMany(WorkoutExercise, { foreignKey: 'workoutSessionId', as: 'exercises' });
  
  // Enhanced WorkoutExercise Associations with Sets
  // ---------------------------------------------
  WorkoutExercise.belongsTo(WorkoutSession, { foreignKey: 'workoutSessionId', as: 'workoutSession' });
  WorkoutExercise.belongsTo(Exercise, { foreignKey: 'exerciseId', as: 'exercise' });
  WorkoutExercise.hasMany(Set, { foreignKey: 'workoutExerciseId', as: 'sets' });
  
  Set.belongsTo(WorkoutExercise, { foreignKey: 'workoutExerciseId', as: 'workoutExercise' });
  
  // WorkoutPlan Associations with normalized structure
  // ------------------------------------------------
  WorkoutPlan.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
  WorkoutPlan.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
  WorkoutPlan.hasMany(WorkoutSession, { foreignKey: 'workoutPlanId', as: 'sessions' });
  WorkoutPlan.hasMany(WorkoutPlanDay, { foreignKey: 'workoutPlanId', as: 'days' });
  
  WorkoutPlanDay.belongsTo(WorkoutPlan, { foreignKey: 'workoutPlanId', as: 'workoutPlan' });
  WorkoutPlanDay.hasMany(WorkoutPlanDayExercise, { foreignKey: 'workoutPlanDayId', as: 'exercises' });
  
  WorkoutPlanDayExercise.belongsTo(WorkoutPlanDay, { foreignKey: 'workoutPlanDayId', as: 'workoutPlanDay' });
  WorkoutPlanDayExercise.belongsTo(Exercise, { foreignKey: 'exerciseId', as: 'exercise' });
  WorkoutPlanDayExercise.belongsTo(Exercise, { foreignKey: 'alternateExerciseId', as: 'alternateExercise' });
  
  // Client Progress Associations
  // ---------------------------
  ClientProgress.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  
  // Gamification Associations
  // ------------------------
  Gamification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  
  // GamificationSettings has no direct associations as it's a global settings model
  // It's a standalone table that doesn't directly relate to other models
  
  // Achievement Associations
  // -----------------------
  Achievement.belongsToMany(User, { 
    through: 'UserAchievements',
    foreignKey: 'achievementId',
    otherKey: 'userId',
    as: 'users'
  });

  // E-Commerce Associations
  // ----------------------
  User.hasMany(ShoppingCart, { foreignKey: 'userId', as: 'shoppingCarts' });
  ShoppingCart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  ShoppingCart.hasMany(CartItem, { foreignKey: 'cartId', as: 'cartItems' });
  CartItem.belongsTo(ShoppingCart, { foreignKey: 'cartId', as: 'cart' });
  CartItem.belongsTo(StorefrontItem, { foreignKey: 'storefrontItemId', as: 'storefrontItem' });
  StorefrontItem.hasMany(CartItem, { foreignKey: 'storefrontItemId', as: 'cartItems' });

  // Order Associations
  User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
  Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Order.belongsTo(ShoppingCart, { foreignKey: 'cartId', as: 'cart' });
  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'orderItems' });
  OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  OrderItem.belongsTo(StorefrontItem, { foreignKey: 'storefrontItemId', as: 'storefrontItem' });

  // Food Scanner Associations
  User.hasMany(FoodScanHistory, { foreignKey: 'userId', as: 'foodScans' });
  FoodProduct.hasMany(FoodScanHistory, { foreignKey: 'productId', as: 'scanHistory' });
  
  FoodScanHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  FoodScanHistory.belongsTo(FoodProduct, { foreignKey: 'productId', as: 'product' });

  // Social Associations
  // ------------------
  // Friendships
  User.hasMany(Friendship, { foreignKey: 'userId', as: 'friendships' });
  User.hasMany(Friendship, { foreignKey: 'friendId', as: 'friendOf' });
  Friendship.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Friendship.belongsTo(User, { foreignKey: 'friendId', as: 'friend' });

  // Social Posts
  User.hasMany(SocialPost, { foreignKey: 'userId', as: 'posts' });
  SocialPost.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  SocialPost.hasMany(SocialComment, { foreignKey: 'postId', as: 'comments' });
  SocialPost.hasMany(SocialLike, { foreignKey: 'postId', as: 'likes' });

  // Comments
  User.hasMany(SocialComment, { foreignKey: 'userId', as: 'comments' });
  SocialComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  SocialComment.belongsTo(SocialPost, { foreignKey: 'postId', as: 'post' });

  // Likes
  User.hasMany(SocialLike, { foreignKey: 'userId', as: 'likes' });
  SocialLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  SocialLike.belongsTo(SocialPost, { foreignKey: 'postId', as: 'post' });

  // Challenges
  Challenge.hasMany(ChallengeTeam, { foreignKey: 'challengeId', as: 'teams' });
  Challenge.hasMany(ChallengeParticipant, { foreignKey: 'challengeId', as: 'participants' });
  
  ChallengeTeam.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });
  ChallengeTeam.hasMany(ChallengeParticipant, { foreignKey: 'teamId', as: 'members' });
  
  ChallengeParticipant.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });
  ChallengeParticipant.belongsTo(ChallengeTeam, { foreignKey: 'teamId', as: 'team' });
  ChallengeParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  
  User.hasMany(ChallengeParticipant, { foreignKey: 'userId', as: 'challengeParticipations' });
};

export {
  User,
  Exercise,
  WorkoutSession,
  WorkoutExercise,
  WorkoutPlan,
  ClientProgress,
  Gamification,
  Achievement,
  Set,
  MuscleGroup,
  ExerciseMuscleGroup,
  Equipment,
  ExerciseEquipment,
  WorkoutPlanDay,
  WorkoutPlanDayExercise,
  GamificationSettings,
  UserAchievement,
  UserReward,
  UserMilestone,
  Reward,
  Milestone,
  PointTransaction,
  
  // E-Commerce Models
  StorefrontItem,
  ShoppingCart,
  CartItem,
  Order,
  OrderItem,
  
  // Social Models
  Challenge,
  ChallengeTeam,
  ChallengeParticipant,
  Friendship,
  SocialPost,
  SocialComment,
  SocialLike
};

export default setupAssociations;