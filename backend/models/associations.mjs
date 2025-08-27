/**
 * Model Associations
 * =================
 * This file defines all associations between SEQUELIZE models only.
 * MongoDB models are handled separately and don't need associations here.
 * Updated to include Financial Intelligence models and Content Moderation models.
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

    // Enhanced Gamification Models (Sequelize)
    const ChallengeModule = await import('./Challenge.mjs');
    const ChallengeParticipantModule = await import('./ChallengeParticipant.mjs');
    const GoalModule = await import('./Goal.mjs');
    const ProgressDataModule = await import('./ProgressData.mjs');
    const UserFollowModule = await import('./UserFollow.mjs');

    // E-Commerce Models (Sequelize)
    const StorefrontItemModule = await import('./StorefrontItem.mjs');
    const ShoppingCartModule = await import('./ShoppingCart.mjs');
    const CartItemModule = await import('./CartItem.mjs');
    const OrderModule = await import('./Order.mjs');
    const OrderItemModule = await import('./OrderItem.mjs');
    const SessionPackageModule = await import('./SessionPackage.mjs');

    // Food Scanner Models (Sequelize)
    const FoodIngredientModule = await import('./FoodIngredient.mjs');
    const FoodProductModule = await import('./FoodProduct.mjs');
    const FoodScanHistoryModule = await import('./FoodScanHistory.mjs');

    // Social Models (Sequelize)
    const SocialModels = await import('./social/index.mjs');
    const { SocialPost, SocialComment, SocialLike, Friendship, Challenge: SocialChallenge, ChallengeParticipant: SocialChallengeParticipant, ChallengeTeam, PostReport, ModerationAction } = SocialModels;

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

    // Enhanced Gamification Models
    const Challenge = ChallengeModule.default;
    const ChallengeParticipant = ChallengeParticipantModule.default;
    const Goal = GoalModule.default;
    const ProgressData = ProgressDataModule.default;
    const UserFollow = UserFollowModule.default;

    // E-Commerce Models
    const StorefrontItem = StorefrontItemModule.default;
    const ShoppingCart = ShoppingCartModule.default;
    const CartItem = CartItemModule.default;
    const Order = OrderModule.default;
    const OrderItem = OrderItemModule.default;
    const SessionPackage = SessionPackageModule.default;

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
    
    // 🔒 ENHANCED DUPLICATE PREVENTION: Robust checking with specific alias verification
    const hasUserAssociations = User.associations && Object.keys(User.associations).length > 0;
    const hasCartAssociations = CartItem.associations && Object.keys(CartItem.associations).length > 0;
    const hasStorefrontAssociations = StorefrontItem.associations && Object.keys(StorefrontItem.associations).length > 0;
    
    // 🔍 CRITICAL FIX: Check specifically for the problematic 'clientProgress' alias
    const hasClientProgressAlias = !!(User.associations && User.associations.clientProgress);
    
    if (hasUserAssociations || hasCartAssociations || hasStorefrontAssociations || hasClientProgressAlias) {
      console.log('🔒 DUPLICATE PREVENTION: Associations already exist, performing detailed verification...');
      console.log('🔍 User associations found:', hasUserAssociations ? Object.keys(User.associations) : 'none');
      console.log('🔍 ClientProgress alias exists:', hasClientProgressAlias);
      
      // Critical verification for P0 checkout fix
      const criticalAssociationStatus = {
        userToClientProgress: hasClientProgressAlias,
        cartToStorefront: !!(CartItem.associations && CartItem.associations.storefrontItem),
        cartToShoppingCart: !!(CartItem.associations && CartItem.associations.cart),
        shoppingCartToItems: !!(ShoppingCart.associations && ShoppingCart.associations.cartItems),
        userToCart: !!(User.associations && User.associations.shoppingCarts)
      };
      
      console.log('🎯 CRITICAL ASSOCIATIONS STATUS:', criticalAssociationStatus);
      
      // Verify all critical associations exist
      const allCriticalExist = Object.values(criticalAssociationStatus).every(status => status === true);
      
      if (allCriticalExist) {
        console.log('✅ DUPLICATE PREVENTION VERIFIED: All critical associations confirmed - safely returning existing models');
      } else {
        console.warn('⚠️ DUPLICATE PREVENTION WARNING: Some critical associations missing');
        console.log('Missing associations:', Object.entries(criticalAssociationStatus)
          .filter(([key, value]) => !value)
          .map(([key]) => key));
        
        // If clientProgress alias exists but other associations are missing, we might have a partial setup
        if (hasClientProgressAlias) {
          console.log('🔒 CRITICAL: clientProgress alias exists - preventing duplicate setup');
        }
      }
      
      return {
        User, ClientProgress, Gamification, Achievement, GamificationSettings,
        UserAchievement, UserReward, UserMilestone, Reward, Milestone, 
        PointTransaction, StorefrontItem, ShoppingCart, CartItem, Order, 
        OrderItem, FoodIngredient, FoodProduct, FoodScanHistory, 
        SocialPost, SocialComment, SocialLike, Friendship, SocialChallenge, SocialChallengeParticipant, ChallengeTeam,
        PostReport, ModerationAction,
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
    
    // Social Model Associations
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
    
    // ENHANCED GAMIFICATION CHALLENGE SYSTEM ASSOCIATIONS
    // ===================================================
    
    // User -> Challenges (Single definitive association)
    User.hasMany(Challenge, { foreignKey: 'createdBy', as: 'createdChallenges' });
    Challenge.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
    
    // Challenge Participants (Single system)
    User.hasMany(ChallengeParticipant, { foreignKey: 'userId', as: 'challengeParticipations' });
    ChallengeParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    Challenge.hasMany(ChallengeParticipant, { foreignKey: 'challengeId', as: 'participants' });
    ChallengeParticipant.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });
    
    // Challenge -> Participants (Many-to-Many)
    Challenge.belongsToMany(User, {
      through: ChallengeParticipant,
      foreignKey: 'challengeId',
      otherKey: 'userId',
      as: 'participantUsers'
    });
    
    User.belongsToMany(Challenge, {
      through: ChallengeParticipant,
      foreignKey: 'userId', 
      otherKey: 'challengeId',
      as: 'participatingChallenges'
    });
    
    // Direct associations for detailed queries
    Challenge.hasMany(ChallengeParticipant, { foreignKey: 'challengeId', as: 'participantDetails' });
    ChallengeParticipant.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challengeDetails' });
    
    User.hasMany(ChallengeParticipant, { foreignKey: 'userId', as: 'participationDetails' });
    ChallengeParticipant.belongsTo(User, { foreignKey: 'userId', as: 'userDetails' });
    
    // User -> Goals
    User.hasMany(Goal, { foreignKey: 'userId', as: 'goals' });
    Goal.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // User -> Progress Data
    User.hasMany(ProgressData, { foreignKey: 'userId', as: 'progressData' });
    ProgressData.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // User -> Social Following (Enhanced)
    User.hasMany(UserFollow, { foreignKey: 'followerId', as: 'following' });
    User.hasMany(UserFollow, { foreignKey: 'followingId', as: 'followers' });
    
    UserFollow.belongsTo(User, { foreignKey: 'followerId', as: 'follower' });
    UserFollow.belongsTo(User, { foreignKey: 'followingId', as: 'following' });

    // CONTENT MODERATION ASSOCIATIONS
    // ===============================
    
    // PostReport associations
    User.hasMany(PostReport, { foreignKey: 'reporterId', as: 'reportsMade' });
    User.hasMany(PostReport, { foreignKey: 'contentAuthorId', as: 'reportsReceived' });
    User.hasMany(PostReport, { foreignKey: 'resolvedBy', as: 'reportsResolved' });
    
    PostReport.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
    PostReport.belongsTo(User, { foreignKey: 'contentAuthorId', as: 'contentAuthor' });
    PostReport.belongsTo(User, { foreignKey: 'resolvedBy', as: 'resolver' });
    
    // ModerationAction associations
    User.hasMany(ModerationAction, { foreignKey: 'moderatorId', as: 'moderationActions' });
    User.hasMany(ModerationAction, { foreignKey: 'contentAuthorId', as: 'moderationActionsReceived' });
    
    ModerationAction.belongsTo(User, { foreignKey: 'moderatorId', as: 'moderator' });
    ModerationAction.belongsTo(User, { foreignKey: 'contentAuthorId', as: 'contentAuthor' });
    ModerationAction.belongsTo(PostReport, { foreignKey: 'relatedReportId', as: 'relatedReport' });
    PostReport.hasMany(ModerationAction, { foreignKey: 'relatedReportId', as: 'actions' });
    
    // Social content moderation associations
    User.hasMany(SocialPost, { foreignKey: 'flaggedBy', as: 'flaggedPosts' });
    User.hasMany(SocialPost, { foreignKey: 'lastModeratedBy', as: 'moderatedPosts' });
    User.hasMany(SocialComment, { foreignKey: 'flaggedBy', as: 'flaggedComments' });
    User.hasMany(SocialComment, { foreignKey: 'lastModeratedBy', as: 'moderatedComments' });
    
    SocialPost.belongsTo(User, { foreignKey: 'flaggedBy', as: 'flaggedByUser' });
    SocialPost.belongsTo(User, { foreignKey: 'lastModeratedBy', as: 'lastModeratedByUser' });
    SocialComment.belongsTo(User, { foreignKey: 'flaggedBy', as: 'flaggedByUser' });
    SocialComment.belongsTo(User, { foreignKey: 'lastModeratedBy', as: 'lastModeratedByUser' });

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

    // ENHANCED GAMIFICATION ASSOCIATIONS
    // =====================================

    // User -> Goals
    User.hasMany(Goal, { foreignKey: 'userId', as: 'goals' });
    Goal.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // User -> Progress Data
    User.hasMany(ProgressData, { foreignKey: 'userId', as: 'progressData' });
    ProgressData.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    
    // User -> Social Following (Enhanced)
    User.hasMany(UserFollow, { foreignKey: 'followerId', as: 'following' });
    User.hasMany(UserFollow, { foreignKey: 'followingId', as: 'followers' });
    
    UserFollow.belongsTo(User, { foreignKey: 'followerId', as: 'follower' });
    UserFollow.belongsTo(User, { foreignKey: 'followingId', as: 'following' });

    // ENHANCED EXISTING ASSOCIATIONS
    // ==============================
    // Challenge -> Goals (challenges can have related goals)
    Challenge.hasMany(Goal, { foreignKey: 'challengeId', as: 'relatedGoals', constraints: false });
    Goal.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'relatedChallenge', constraints: false });

    // ProgressData -> Challenges (track challenge progress)
    ProgressData.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge', constraints: false });
    Challenge.hasMany(ProgressData, { foreignKey: 'challengeId', as: 'progressEntries', constraints: false });

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
    console.log('✅ Content Moderation models integrated');
    
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
      
      // Enhanced Gamification Models
      Challenge,
      ChallengeParticipant,
      Goal,
      ProgressData,
      UserFollow,
      
      // Social Models
      SocialPost,
      SocialComment,
      SocialLike,
      Friendship,
      SocialChallenge,
      SocialChallengeParticipant,
      ChallengeTeam,
      
      // Content Moderation Models
      PostReport,
      ModerationAction,
      
      // E-Commerce Models
      StorefrontItem,
      ShoppingCart,
      CartItem,
      Order,
      OrderItem,
      SessionPackage,
      
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

// 🔒 ENHANCED SINGLETON: Prevent multiple association setups
let modelsInstance = null;
let isInitializing = false;

// We'll use dynamic imports to get around the circular dependency issue
const importModelsAndAssociate = async () => {
  try {
    // 🔒 CRITICAL FIX: Prevent concurrent initialization
    if (modelsInstance) {
      console.log('✅ ASSOCIATION SINGLETON: Returning existing models instance');
      return modelsInstance;
    }
    
    if (isInitializing) {
      console.log('⏳ ASSOCIATION SINGLETON: Waiting for initialization to complete...');
      // Wait for initialization to complete by polling
      let attempts = 0;
      while (isInitializing && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (modelsInstance) {
        console.log('✅ ASSOCIATION SINGLETON: Initialization completed, returning models');
        return modelsInstance;
      } else {
        throw new Error('Association initialization timed out');
      }
    }
    
    isInitializing = true;
    console.log('🚀 ASSOCIATION SINGLETON: Starting first-time initialization...');
    
    modelsInstance = await setupAssociations();
    isInitializing = false;
    
    console.log('✅ ASSOCIATION SINGLETON: Initialization completed successfully');
    return modelsInstance;
  } catch (error) {
    isInitializing = false;
    console.error('❌ ASSOCIATION SINGLETON: Failed to import models and set up associations:', error);
    throw error;
  }
};

export default async function getModels() {
  return await importModelsAndAssociate();
}
