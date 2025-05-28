/**
 * Model Associations
 * =================
 * This file defines all associations between SEQUELIZE models only.
 * MongoDB models are handled separately and don't need associations here.
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

    // Notification and Orientation (Sequelize)
    const OrientationModule = await import('./Orientation.mjs');
    const NotificationModule = await import('./Notification.mjs');

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

    // Orientation and Notification Models
    const Orientation = OrientationModule.default;
    const Notification = NotificationModule.default;

    console.log('Setting up Sequelize associations only...');
    
    // Check if associations already exist (prevent duplicate associations)
    if (User.associations && Object.keys(User.associations).length > 0) {
      console.log('⚠️ Associations already exist, skipping setup');
      return {
        User, ClientProgress, Gamification, Achievement, GamificationSettings,
        UserAchievement, UserReward, UserMilestone, Reward, Milestone, 
        PointTransaction, StorefrontItem, ShoppingCart, CartItem, Order, 
        OrderItem, FoodIngredient, FoodProduct, FoodScanHistory, 
        Orientation, Notification
      };
    }
    
    // USER ASSOCIATIONS (only with Sequelize models)
    // ============================================
    User.hasOne(ClientProgress, { foreignKey: 'userId', as: 'clientProgress' }); // Changed alias from 'progress'
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
    
    // NOTIFICATION ASSOCIATIONS
    // =========================
    User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
    Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    User.hasMany(Notification, { foreignKey: 'senderId', as: 'sentNotifications' });
    Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

    console.log('✅ Sequelize model associations established successfully');
    console.log('Note: MongoDB models (exercises, workout plans/sessions) are handled separately');

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
      
      // Orientation Model
      Orientation,
      
      // Notification Model
      Notification
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
