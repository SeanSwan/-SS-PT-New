/**
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

// Import models using dynamic imports to avoid circular dependencies
const setupAssociations = async () => {
  try {
    // Dynamic imports to avoid ES module issues
    const UserModule = await import('./User.mjs');
    const ExerciseModule = await import('./Exercise.mjs');
    const WorkoutSessionModule = await import('./WorkoutSession.mjs');
    const WorkoutExerciseModule = await import('./WorkoutExercise.mjs');
    const WorkoutPlanModule = await import('./WorkoutPlan.mjs');
    const ClientProgressModule = await import('./ClientProgress.mjs');
    const GamificationModule = await import('./Gamification.mjs');
    const AchievementModule = await import('./Achievement.mjs');
    const SetModule = await import('./Set.mjs');
    const MuscleGroupModule = await import('./MuscleGroup.mjs');
    const ExerciseMuscleGroupModule = await import('./ExerciseMuscleGroup.mjs');
    const EquipmentModule = await import('./Equipment.mjs');
    const ExerciseEquipmentModule = await import('./ExerciseEquipment.mjs');
    const WorkoutPlanDayModule = await import('./WorkoutPlanDay.mjs');
    const WorkoutPlanDayExerciseModule = await import('./WorkoutPlanDayExercise.mjs');
    const GamificationSettingsModule = await import('./GamificationSettings.mjs');
    const UserAchievementModule = await import('./UserAchievement.mjs');
    const UserRewardModule = await import('./UserReward.mjs');
    const UserMilestoneModule = await import('./UserMilestone.mjs');
    const RewardModule = await import('./Reward.mjs');
    const MilestoneModule = await import('./Milestone.mjs');
    const PointTransactionModule = await import('./PointTransaction.mjs');

    // E-Commerce Models
    const StorefrontItemModule = await import('./StorefrontItem.mjs');
    const ShoppingCartModule = await import('./ShoppingCart.mjs');
    const CartItemModule = await import('./CartItem.mjs');
    const OrderModule = await import('./Order.mjs');
    const OrderItemModule = await import('./OrderItem.mjs');

    // Food Scanner Models
    const FoodIngredientModule = await import('./FoodIngredient.mjs');
    const FoodProductModule = await import('./FoodProduct.mjs');
    const FoodScanHistoryModule = await import('./FoodScanHistory.mjs');

    // Social Models
    const SocialModules = await import('./social/index.mjs');
    const OrientationModule = await import('./Orientation.mjs');
    const NotificationModule = await import('./Notification.mjs');

    // Extract default exports
    const User = UserModule.default;
    const Exercise = ExerciseModule.default;
    const WorkoutSession = WorkoutSessionModule.default;
    const WorkoutExercise = WorkoutExerciseModule.default;
    const WorkoutPlan = WorkoutPlanModule.default;
    const ClientProgress = ClientProgressModule.default;
    const Gamification = GamificationModule.default;
    const Achievement = AchievementModule.default;
    const Set = SetModule.default;
    const MuscleGroup = MuscleGroupModule.default;
    const ExerciseMuscleGroup = ExerciseMuscleGroupModule.default;
    const Equipment = EquipmentModule.default;
    const ExerciseEquipment = ExerciseEquipmentModule.default;
    const WorkoutPlanDay = WorkoutPlanDayModule.default;
    const WorkoutPlanDayExercise = WorkoutPlanDayExerciseModule.default;
    const GamificationSettings = GamificationSettingsModule.default;
    const UserAchievement = UserAchievementModule.default;
    const UserReward = UserRewardModule.default;
    const UserMilestone = UserMilestoneModule.default;
    const Reward = RewardModule.default;
    const Milestone = MilestoneModule.default;
    const PointTransaction = PointTransactionModule.default;

    // E-Commerce Models
    const StorefrontItem = StorefrontItemModule.default;
    const ShoppingCart = ShoppingCartModule.default;
    const CartItem = CartItemModule.default;
    const Order = OrderModule.default;
    const OrderItem = OrderItemModule.default;

    // Food Scanner Models
    const FoodIngredient = FoodIngredientModule.default;
    const FoodProduct = FoodProductModule.default;
    const FoodScanHistory = FoodScanHistoryModule.default;

    // Social Models
    const { 
      Challenge, 
      ChallengeTeam, 
      ChallengeParticipant, 
      Friendship, 
      SocialPost, 
      SocialComment, 
      SocialLike 
    } = SocialModules;

    // Orientation Model
    const Orientation = OrientationModule.default;
    
    // Notification Model
    const Notification = NotificationModule.default;

    // Define associations
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
    User.hasMany(Orientation, { foreignKey: 'userId', as: 'orientations' });
    FoodProduct.hasMany(FoodScanHistory, { foreignKey: 'productId', as: 'scanHistory' });
    
    FoodScanHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    // Orientation associations
    User.hasMany(Orientation, { foreignKey: 'userId', as: 'orientations' });
    Orientation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Notification associations
    User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
    Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    User.hasMany(Notification, { foreignKey: 'senderId', as: 'sentNotifications' });
    Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
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

    console.log('✅ Model associations established successfully');

    // Return models for exporting
    return {
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
      
      // Food Scanner Models
      FoodIngredient,
      FoodProduct,
      FoodScanHistory,
      
      // Social Models
      Challenge,
      ChallengeTeam,
      ChallengeParticipant,
      Friendship,
      SocialPost,
      SocialComment,
      SocialLike,
      
      // Orientation Model
      Orientation,
      
      // Notification Model
      Notification
    };
  } catch (error) {
    console.error('❌ Error setting up model associations:', error);
    throw error;
  }
};

// We'll use dynamic imports to get around the circular dependency issue
const importModelsAndAssociate = async () => {
  try {
    return await setupAssociations();
  } catch (error) {
    console.error('Failed to import models and set up associations:', error);
    throw error;
  }
};

export default async function getModels() {
  return await importModelsAndAssociate();
}
