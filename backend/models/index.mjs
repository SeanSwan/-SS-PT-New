/**
 * SwanStudios Models Index - Production-Safe Centralized Export
 * =============================================================
 * Master Prompt v30 Aligned - Conservative approach that works with existing code
 * 
 * This file creates a safe bridge to ensure all models have proper associations
 * established before being exported. It works with the existing associations.mjs
 * system to provide a single source of truth for properly initialized models.
 * 
 * CRITICAL: This file ensures CartItem <-> StorefrontItem associations are
 * always available when models are imported from this index.
 */

import getModels from './associations.mjs';
import logger from '../utils/logger.mjs';

// Singleton to ensure models are only initialized once
let modelsCache = null;
let initializationPromise = null;

/**
 * Get database object with all models and associations established
 * This function ensures models are only initialized once and cached
 */
export const getDB = async () => {
  // Return cached models if already initialized
  if (modelsCache) {
    return modelsCache;
  }
  
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return await initializationPromise;
  }
  
  // Start initialization
  initializationPromise = initializeModelsOnce();
  modelsCache = await initializationPromise;
  return modelsCache;
};

/**
 * Initialize models and associations exactly once
 */
const initializeModelsOnce = async () => {
  try {
    logger.info('🔗 Initializing centralized model system...');
    
    // Use existing associations.mjs system (proven and stable)
    const models = await getModels();
    
    if (!models) {
      throw new Error('Model initialization returned null');
    }
    
    // 🎯 CRITICAL P0 VERIFICATION: Ensure CartItem -> StorefrontItem association exists
    if (!models.CartItem || !models.CartItem.associations || !models.CartItem.associations.storefrontItem) {
      throw new Error('CRITICAL P0 BUG: CartItem -> StorefrontItem association missing!');
    }
    
    // Additional critical association verifications
    if (!models.ShoppingCart || !models.ShoppingCart.associations || !models.ShoppingCart.associations.cartItems) {
      throw new Error('CRITICAL: ShoppingCart -> cartItems association missing!');
    }
    
    logger.info('✅ P0 Critical associations verified:');
    logger.info('  - CartItem -> StorefrontItem: CONFIRMED');
    logger.info('  - ShoppingCart -> cartItems: CONFIRMED');
    
    // Add database connection references
    models.sequelize = models.User.sequelize;  // All models use same sequelize instance
    models.Sequelize = models.User.sequelize.constructor;
    
    logger.info(`✅ Centralized model system initialized with ${Object.keys(models).length} models`);
    
    return models;
    
  } catch (error) {
    logger.error('❌ CRITICAL: Centralized model initialization failed!', {
      error: error.message,
      stack: error.stack
    });
    
    // Reset caches so retry is possible
    modelsCache = null;
    initializationPromise = null;
    
    throw new Error(`Model initialization failed: ${error.message}`);
  }
};

// Initialize models immediately when this module is loaded (for production stability)
let autoInitPromise = null;

const autoInitialize = async () => {
  try {
    await getDB();
    logger.info('🚀 Models auto-initialized successfully on module load');
  } catch (error) {
    logger.error('❌ Auto-initialization failed:', error.message);
    // Don't throw here - allow manual initialization later
  }
};

// Start auto-initialization (non-blocking)
autoInitPromise = autoInitialize();

// Export individual models for direct import
// These will be populated after initialization
export let sequelize, Sequelize;
export let User, Session, ClientProgress;
export let Gamification, Achievement, GamificationSettings;
export let UserAchievement, UserReward, UserMilestone, Reward, Milestone, PointTransaction;
export let StorefrontItem, ShoppingCart, CartItem, Order, OrderItem;
export let FoodIngredient, FoodProduct, FoodScanHistory;
export let WorkoutPlan, WorkoutPlanDay, WorkoutPlanDayExercise, WorkoutSession, WorkoutExercise, Exercise, Set;
export let MuscleGroup, ExerciseMuscleGroup, Equipment, ExerciseEquipment;
export let Orientation, Notification, NotificationSettings, AdminSettings, Contact;
export let SocialPost, SocialComment, SocialLike, Friendship, Challenge, ChallengeParticipant, ChallengeTeam;
export let FinancialTransaction, BusinessMetrics, AdminNotification;

// Populate exports after initialization
const populateExports = async () => {
  try {
    // Ensure auto-initialization is complete
    if (autoInitPromise) {
      await autoInitPromise;
    }
    
    const db = await getDB();
    
    // Core system
    sequelize = db.sequelize;
    Sequelize = db.Sequelize;
    
    // Main models
    User = db.User;
    Session = db.Session;
    ClientProgress = db.ClientProgress;
    
    // Gamification
    Gamification = db.Gamification;
    Achievement = db.Achievement;
    GamificationSettings = db.GamificationSettings;
    UserAchievement = db.UserAchievement;
    UserReward = db.UserReward;
    UserMilestone = db.UserMilestone;
    Reward = db.Reward;
    Milestone = db.Milestone;
    PointTransaction = db.PointTransaction;
    
    // E-Commerce (CRITICAL for P0 fix)
    StorefrontItem = db.StorefrontItem;
    ShoppingCart = db.ShoppingCart;
    CartItem = db.CartItem;
    Order = db.Order;
    OrderItem = db.OrderItem;
    
    // Food Scanner
    FoodIngredient = db.FoodIngredient;
    FoodProduct = db.FoodProduct;
    FoodScanHistory = db.FoodScanHistory;
    
    // Workout system
    WorkoutPlan = db.WorkoutPlan;
    WorkoutPlanDay = db.WorkoutPlanDay;
    WorkoutPlanDayExercise = db.WorkoutPlanDayExercise;
    WorkoutSession = db.WorkoutSession;
    WorkoutExercise = db.WorkoutExercise;
    Exercise = db.Exercise;
    Set = db.Set;
    MuscleGroup = db.MuscleGroup;
    ExerciseMuscleGroup = db.ExerciseMuscleGroup;
    Equipment = db.Equipment;
    ExerciseEquipment = db.ExerciseEquipment;
    
    // System
    Orientation = db.Orientation;
    Notification = db.Notification;
    NotificationSettings = db.NotificationSettings;
    AdminSettings = db.AdminSettings;
    Contact = db.Contact;
    
    // Social
    SocialPost = db.SocialPost;
    SocialComment = db.SocialComment;
    SocialLike = db.SocialLike;
    Friendship = db.Friendship;
    Challenge = db.Challenge;
    ChallengeParticipant = db.ChallengeParticipant;
    ChallengeTeam = db.ChallengeTeam;
    
    // Financial
    FinancialTransaction = db.FinancialTransaction;
    BusinessMetrics = db.BusinessMetrics;
    AdminNotification = db.AdminNotification;
    
    logger.info('✅ Model exports populated successfully');
    
  } catch (error) {
    logger.error('❌ Failed to populate model exports:', error.message);
    throw error;
  }
};

// Populate exports immediately
await populateExports();

// Default export - the complete database object
export default await getDB();
