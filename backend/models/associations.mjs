/**
 * Model Associations
 * =================
 * This file defines all associations between SEQUELIZE models only.
 * MongoDB models are handled separately and don't need associations here.
 * Updated to include Financial Intelligence models.
 */

// Import models using dynamic imports to avoid circular dependencies
const setupAssociations = async () => {
  try {
    console.log('Starting Sequelize model imports...');
    
    // Import ONLY SEQUELIZE MODELS (PostgreSQL)
    const UserModule = await import('./User.mjs');
    const SessionModule = await import('./Session.mjs');
    const ClientProgressModule = await import('./ClientProgress.mjs');
    const GamificationModule = await import('./Gamification.mjs');
    const AchievementModule = await import('./Achievement.mjs');
    const GamificationSettingsModule = await import('./GamificationSettings.mjs');
    const UserAchievementModule = await import('./UserAchievement.mjs');
    const UserRewardModule = await import('./UserReward.mjs');
    const UserMilestoneModule = await import('./UserMilestone.mjs');
    const RewardModule = await import('./Reward.mjs');
    const MilestoneModule = await import('./Milestone.mjs');
    const PointTransactionModule = await import('./PointTransaction.mjs');

    // E-Commerce Models (Sequelize)
    const StorefrontItemModule = await import('./StorefrontItem.mjs');
    const ShoppingCartModule = await import('./ShoppingCart.mjs');
    const CartItemModule = await import('./CartItem.mjs');
    const OrderModule = await import('./Order.mjs');
    const OrderItemModule = await import('./OrderItem.mjs');

    // Food Scanner Models (Sequelize)
    const FoodIngredientModule = await import('./FoodIngredient.mjs');
    const FoodProductModule = await import('./FoodProduct.mjs');
    const FoodScanHistoryModule = await import('./FoodScanHistory.mjs');

    // Social Models (Sequelize)
    const SocialModels = await import('./social/index.mjs');
    const { SocialPost, SocialComment, SocialLike, Friendship, Challenge, ChallengeParticipant, ChallengeTeam } = SocialModels;

    // Workout Models (Sequelize)
    const WorkoutPlanModule = await import('./WorkoutPlan.mjs');
    const WorkoutPlanDayModule = await import('./WorkoutPlanDay.mjs');
    const WorkoutPlanDayExerciseModule = await import('./WorkoutPlanDayExercise.mjs');
    const WorkoutSessionModule = await import('./WorkoutSession.mjs');
    const WorkoutExerciseModule = await import('./WorkoutExercise.mjs');
    const ExerciseModule = await import('./Exercise.mjs');
    const SetModule = await import('./Set.mjs');
    
    // Exercise Reference Models (Sequelize)
    const MuscleGroupModule = await import('./MuscleGroup.mjs');
    const ExerciseMuscleGroupModule = await import('./ExerciseMuscleGroup.mjs');
    const EquipmentModule = await import('./Equipment.mjs');
    const ExerciseEquipmentModule = await import('./ExerciseEquipment.mjs');
    
    // Notification and Admin Models (Sequelize)
    const OrientationModule = await import('./Orientation.mjs');
    const NotificationModule = await import('./Notification.mjs');
    const NotificationSettingsModule = await import('./NotificationSettings.mjs');
    const AdminSettingsModule = await import('./AdminSettings.mjs');
    const ContactModule = await import('./contact.mjs');
    
    // Financial Models (Sequelize)
    const FinancialTransactionModule = await import('./financial/FinancialTransaction.mjs');
    const BusinessMetricsModule = await import('./financial/BusinessMetrics.mjs');
    const AdminNotificationModule = await import('./financial/AdminNotification.mjs');
    
    // NASM Workout Tracking Models (Sequelize)
    const ClientTrainerAssignmentModule = await import('./ClientTrainerAssignment.mjs');
    const TrainerPermissionsModule = await import('./TrainerPermissions.mjs');
    const DailyWorkoutFormModule = await import('./DailyWorkoutForm.mjs');

    console.log('Extracting Sequelize models...');
    
    // Extract default exports for SEQUELIZE models only
    const User = UserModule.default;
    const Session = SessionModule.default;
    const ClientProgress = ClientProgressModule.default;
    const Gamification = GamificationModule.default;
    const Achievement = AchievementModule.default;
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

    // Workout Models
    const WorkoutPlan = WorkoutPlanModule.default;
    const WorkoutPlanDay = WorkoutPlanDayModule.default;
    const WorkoutPlanDayExercise = WorkoutPlanDayExerciseModule.default;
    const WorkoutSession = WorkoutSessionModule.default;
    const WorkoutExercise = WorkoutExerciseModule.default;
    const Exercise = ExerciseModule.default;
    const Set = SetModule.default;
    
    // Exercise Reference Models
    const MuscleGroup = MuscleGroupModule.default;
    const ExerciseMuscleGroup = ExerciseMuscleGroupModule.default;
    const Equipment = EquipmentModule.default;
    const ExerciseEquipment = ExerciseEquipmentModule.default;
    
    // Notification and Admin Models
    const Orientation = OrientationModule.default;
    const Notification = NotificationModule.default;
    const NotificationSettings = NotificationSettingsModule.default;
    const AdminSettings = AdminSettingsModule.default;
    const Contact = ContactModule.default;
    
    // Financial Models
    const FinancialTransaction = FinancialTransactionModule.default;
    const BusinessMetrics = BusinessMetricsModule.default;
    const AdminNotification = AdminNotificationModule.default;
    
    // NASM Workout Tracking Models
    const ClientTrainerAssignment = ClientTrainerAssignmentModule.default;
    const TrainerPermissions = TrainerPermissionsModule.default;
    const DailyWorkoutForm = DailyWorkoutFormModule.default;

    console.log('Setting up Sequelize associations only...');
    
    // 🎯 ENHANCED P0 FIX: Robust duplicate checking with detailed verification
    const hasUserAssociations = User.associations && Object.keys(User.associations).length > 0;
    const hasCartAssociations = CartItem.associations && Object.keys(CartItem.associations).length > 0;
    const hasStorefrontAssociations = StorefrontItem.associations && Object.keys(StorefrontItem.associations).length > 0;
    
    if (hasUserAssociations || hasCartAssociations || hasStorefrontAssociations) {
      console.log('🔍 ENHANCED P0 CHECK: Associations already exist, performing verification...');
      
      // Critical verification for P0 checkout fix
      const criticalAssociationStatus = {
        cartToStorefront: !!(CartItem.associations && CartItem.associations.storefrontItem),
        cartToShoppingCart: !!(CartItem.associations && CartItem.associations.cart),
        shoppingCartToItems: !!(ShoppingCart.associations && ShoppingCart.associations.cartItems),
        userToCart: !!(User.associations && User.associations.shoppingCarts)
      };
      
      console.log('🎯 P0 CRITICAL ASSOCIATIONS STATUS:', criticalAssociationStatus);
      
      // Verify all critical associations exist
      const allCriticalExist = Object.values(criticalAssociationStatus).every(status => status === true);
      
      if (allCriticalExist) {
        console.log('✅ ENHANCED P0 VERIFICATION: All critical associations confirmed - returning existing models');
      } else {
        console.warn('⚠️ ENHANCED P0 WARNING: Some critical associations missing, but continuing with existing setup');
        console.log('Missing associations:', Object.entries(criticalAssociationStatus)
          .filter(([key, value]) => !value)
          .map(([key]) => key));
      }
      
      return {
        User, ClientProgress, Gamification, Achievement, GamificationSettings,
        UserAchievement, UserReward, UserMilestone, Reward, Milestone, 
        PointTransaction, StorefrontItem, ShoppingCart, CartItem, Order, 
        OrderItem, FoodIngredient, FoodProduct, FoodScanHistory, 
        SocialPost, SocialComment, SocialLike, Friendship, Challenge, ChallengeParticipant, ChallengeTeam,
        WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise, WorkoutSession, WorkoutExercise, Exercise, Set,
        MuscleGroup, ExerciseMuscleGroup, Equipment, ExerciseEquipment,
        Orientation, Notification, NotificationSettings, AdminSettings, Contact,
        FinancialTransaction, BusinessMetrics, AdminNotification,
        ClientTrainerAssignment, TrainerPermissions, DailyWorkoutForm
      };
    }
    
    // USER ASSOCIATIONS (only with Sequelize models)
    // ============================================
    User.hasOne(ClientProgress, { foreignKey: 'userId', as: 'clientProgress' });
    User.hasOne(Gamification, { foreignKey: 'userId', as: 'gamification' });
    
    // USER-SESSION ASSOCIATIONS (CRITICAL FOR SCHEDULE FUNCTIONALITY)
    // ===============================================================
    // User as client in sessions
    User.hasMany(Session, { foreignKey: 'userId', as: 'clientSessions' });
    Session.belongsTo(User, { foreignKey: 'userId', as: 'client' });
    
    // User as trainer in sessions
    User.hasMany(Session, { foreignKey: 'trainerId', as: 'trainerSessions' });
    Session.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    
    // User to achievements (many-to-many through UserAchievements)
    User.belongsToMany(Achievement, { 
      through: 'UserAchievements',
      foreignKey: 'userId',
      otherKey: 'achievementId',
      as: 'achievements'
    });
    
    // CLIENT PROGRESS ASSOCIATIONS
    // ===========================
    ClientProgress.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // GAMIFICATION ASSOCIATIONS
    // ========================
    Gamification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // ACHIEVEMENT ASSOCIATIONS
    // =======================
    Achievement.belongsToMany(User, { 
      through: 'UserAchievements',
      foreignKey: 'achievementId',
      otherKey: 'userId',
      as: 'users'
    });
    
    // 🎯 CRITICAL FIX: Direct UserAchievement ↔ Achievement associations
    // These direct associations are required for getUserAchievements to work properly
    UserAchievement.belongsTo(Achievement, {
      foreignKey: 'achievementId',
      as: 'achievement'
    });
    
    Achievement.hasMany(UserAchievement, {
      foreignKey: 'achievementId',
      as: 'userAchievements'
    });
    
    // User ↔ UserAchievement associations
    UserAchievement.belongsTo(User, {
      foreignKey: 'userId',
      as: 'user'
    });
    
    User.hasMany(UserAchievement, {
      foreignKey: 'userId',
      as: 'userAchievements'
    });

    // E-COMMERCE ASSOCIATIONS
    // ======================
    User.hasMany(ShoppingCart, { foreignKey: 'userId', as: 'shoppingCarts' });
    ShoppingCart.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    ShoppingCart.hasMany(CartItem, { foreignKey: 'cartId', as: 'cartItems' });
    CartItem.belongsTo(ShoppingCart, { foreignKey: 'cartId', as: 'cart' });
    CartItem.belongsTo(StorefrontItem, { foreignKey: 'storefrontItemId', as: 'storefrontItem' });
    StorefrontItem.hasMany(CartItem, { foreignKey: 'storefrontItemId', as: 'cartItems' });

    // ORDER ASSOCIATIONS
    // ==================
    User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
    Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Order.belongsTo(ShoppingCart, { foreignKey: 'cartId', as: 'cart' });
    Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'orderItems' });
    OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
    OrderItem.belongsTo(StorefrontItem, { foreignKey: 'storefrontItemId', as: 'storefrontItem' });

    // FOOD SCANNER ASSOCIATIONS
    // =========================
    User.hasMany(FoodScanHistory, { foreignKey: 'userId', as: 'foodScans' });
    User.hasMany(Orientation, { foreignKey: 'userId', as: 'orientations' });
    FoodProduct.hasMany(FoodScanHistory, { foreignKey: 'productId', as: 'scanHistory' });
    
    FoodScanHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    FoodScanHistory.belongsTo(FoodProduct, { foreignKey: 'productId', as: 'product' });
    
    // ORIENTATION ASSOCIATIONS
    // =======================
    Orientation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // SOCIAL MODEL ASSOCIATIONS
    // =========================
    // User -> Social Posts
    User.hasMany(SocialPost, { foreignKey: 'userId', as: 'socialPosts' });
    SocialPost.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Social Posts -> Comments
    SocialPost.hasMany(SocialComment, { foreignKey: 'postId', as: 'comments' });
    SocialComment.belongsTo(SocialPost, { foreignKey: 'postId', as: 'post' });
    
    // User -> Comments
    User.hasMany(SocialComment, { foreignKey: 'userId', as: 'comments' });
    SocialComment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Social Likes
    User.hasMany(SocialLike, { foreignKey: 'userId', as: 'likes' });
    SocialLike.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Friendships
    User.hasMany(Friendship, { foreignKey: 'requesterId', as: 'sentFriendRequests' });
    User.hasMany(Friendship, { foreignKey: 'recipientId', as: 'receivedFriendRequests' });
    Friendship.belongsTo(User, { foreignKey: 'requesterId', as: 'requester' });
    Friendship.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
    
    // Challenges
    User.hasMany(Challenge, { foreignKey: 'createdBy', as: 'createdChallenges' });
    Challenge.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    
    // Challenge Participants
    User.hasMany(ChallengeParticipant, { foreignKey: 'userId', as: 'challengeParticipations' });
    ChallengeParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Challenge.hasMany(ChallengeParticipant, { foreignKey: 'challengeId', as: 'participants' });
    ChallengeParticipant.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });

    // NOTIFICATION ASSOCIATIONS
    // =========================
    User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
    Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(Notification, { foreignKey: 'senderId', as: 'sentNotifications' });
    Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
    
    // CONTACT ASSOCIATIONS
    // ===================
    User.hasMany(Contact, { foreignKey: 'userId', as: 'contacts' });
    Contact.belongsTo(User, { foreignKey: 'userId', as: 'user' });

    // FINANCIAL ASSOCIATIONS
    // ======================
    // User -> Financial Transactions
    User.hasMany(FinancialTransaction, { foreignKey: 'userId', as: 'financialTransactions' });
    FinancialTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // Order -> Financial Transactions
    Order.hasMany(FinancialTransaction, { foreignKey: 'orderId', as: 'financialTransactions' });
    FinancialTransaction.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
    
    // ShoppingCart -> Financial Transactions
    ShoppingCart.hasMany(FinancialTransaction, { foreignKey: 'cartId', as: 'financialTransactions' });
    FinancialTransaction.belongsTo(ShoppingCart, { foreignKey: 'cartId', as: 'cart' });
    
    // Business Metrics -> Top Package
    BusinessMetrics.belongsTo(StorefrontItem, { foreignKey: 'topPackageId', as: 'topPackage' });
    
    // Admin Notifications -> User (for user-related notifications)
    AdminNotification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(AdminNotification, { foreignKey: 'userId', as: 'adminNotifications' });
    
    // Admin Notifications -> Financial Transaction
    AdminNotification.belongsTo(FinancialTransaction, { foreignKey: 'transactionId', as: 'transaction' });
    FinancialTransaction.hasMany(AdminNotification, { foreignKey: 'transactionId', as: 'notifications' });
    
    // Admin Notifications -> Read By (admin user)
    AdminNotification.belongsTo(User, { foreignKey: 'readBy', as: 'readByUser' });

    // NASM WORKOUT TRACKING ASSOCIATIONS
    // ==================================
    
    // Client-Trainer Assignment Associations
    User.hasMany(ClientTrainerAssignment, { foreignKey: 'clientId', as: 'clientAssignments' });
    User.hasMany(ClientTrainerAssignment, { foreignKey: 'trainerId', as: 'trainerAssignments' });
    User.hasMany(ClientTrainerAssignment, { foreignKey: 'assignedBy', as: 'assignmentsMade' });
    
    ClientTrainerAssignment.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    ClientTrainerAssignment.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    ClientTrainerAssignment.belongsTo(User, { foreignKey: 'assignedBy', as: 'assignedByUser' });
    
    // Trainer Permission Associations
    User.hasMany(TrainerPermissions, { foreignKey: 'trainerId', as: 'trainerPermissions' });
    TrainerPermissions.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    TrainerPermissions.belongsTo(User, { foreignKey: 'grantedBy', as: 'grantedByUser' });
    
    // Daily Workout Form Associations
    User.hasMany(DailyWorkoutForm, { foreignKey: 'clientId', as: 'workoutForms' });
    User.hasMany(DailyWorkoutForm, { foreignKey: 'trainerId', as: 'trainedWorkouts' });
    DailyWorkoutForm.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
    DailyWorkoutForm.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });
    DailyWorkoutForm.belongsTo(WorkoutSession, { foreignKey: 'sessionId', as: 'session' });
    WorkoutSession.hasMany(DailyWorkoutForm, { foreignKey: 'sessionId', as: 'dailyForms' });

    console.log('✅ Sequelize model associations established successfully');
    console.log('✅ Financial Intelligence models integrated');
    console.log('✅ NASM Workout Tracking models integrated');
    
    // Return ONLY SEQUELIZE models for exporting
    return {
      User,
      Session,
      ClientProgress,
      Gamification,
      Achievement,
      GamificationSettings,
      UserAchievement,
      UserReward,
      UserMilestone,
      Reward,
      Milestone,
      PointTransaction,
      
      // Social Models
      SocialPost,
      SocialComment,
      SocialLike,
      Friendship,
      Challenge,
      ChallengeParticipant,
      ChallengeTeam,
      
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
      
      // Workout Models
      WorkoutPlan,
      WorkoutPlanDay,
      WorkoutPlanDayExercise,
      WorkoutSession,
      WorkoutExercise,
      Exercise,
      Set,
      
      // Exercise Reference Models
      MuscleGroup,
      ExerciseMuscleGroup,
      Equipment,
      ExerciseEquipment,
      
      // Notification and Admin Models
      Orientation,
      Notification,
      NotificationSettings,
      AdminSettings,
      Contact,
      
      // Financial Models
      FinancialTransaction,
      BusinessMetrics,
      AdminNotification,
      
      // NASM Workout Tracking Models
      ClientTrainerAssignment,
      TrainerPermissions,
      DailyWorkoutForm
    };
  } catch (error) {
    console.error('❌ Error setting up Sequelize model associations:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
};

// Singleton instance to prevent multiple association setups
let modelsInstance = null;

// We'll use dynamic imports to get around the circular dependency issue
const importModelsAndAssociate = async () => {
  try {
    if (modelsInstance) {
      console.log('⚠️ Returning existing models instance');
      return modelsInstance;
    }
    
    modelsInstance = await setupAssociations();
    return modelsInstance;
  } catch (error) {
    console.error('Failed to import models and set up associations:', error);
    throw error;
  }
};

export default async function getModels() {
  return await importModelsAndAssociate();
}