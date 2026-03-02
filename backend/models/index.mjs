/**
 * SwanStudios Models Index - Enhanced Centralized Model Export Hub
 * ===============================================================
 * Master Prompt v30 aligned - SIMPLIFIED coordination for P0 checkout fix
 * 
 * This file provides a single, reliable source for all models WITH associations.
 * Eliminates the async complexity that was causing import chain confusion.
 * 
 * CRITICAL: All route files MUST import models from this index.mjs
 * to ensure associations are available at runtime.
 */

import logger from '../utils/logger.mjs';
import getModels from './associations.mjs';
import { Op } from '../database.mjs';

// Global models cache - initialized once during server startup
let modelsCache = null;
let isInitialized = false;

/**
 * Initialize models cache (called during server startup)
 * @returns {Promise<Object>} Models object with all associations
 */
const initializeModelsCache = async () => {
  if (isInitialized && modelsCache) {
    logger.info('🔄 Models cache already initialized, returning cached models');
    return modelsCache;
  }
  
  try {
    logger.info('🚀 ENHANCED: Initializing models cache for coordinated imports...');
    
    const models = await getModels();
    
    if (!models) {
      throw new Error('Failed to get models from associations.mjs');
    }
    
    // 🎯 ENHANCED P0 VERIFICATION: Deep association validation
    const associationChecks = {
      cartToStorefront: !!(models.CartItem?.associations?.storefrontItem),
      cartToShoppingCart: !!(models.CartItem?.associations?.cart),
      shoppingCartToItems: !!(models.ShoppingCart?.associations?.cartItems),
      userToShoppingCarts: !!(models.User?.associations?.shoppingCarts)
    };
    
    const allCriticalAssociationsExist = Object.values(associationChecks).every(check => check === true);
    
    if (allCriticalAssociationsExist) {
      logger.info('✅ ENHANCED P0 SUCCESS: All critical associations verified in models cache');
    } else {
      const missingAssociations = Object.entries(associationChecks)
        .filter(([key, value]) => !value)
        .map(([key]) => key);
      logger.error('❌ ENHANCED P0 ERROR: Missing critical associations:', missingAssociations);
      throw new Error(`Critical associations missing: ${missingAssociations.join(', ')}`);
    }
    
    // Cache the models globally
    modelsCache = models;
    isInitialized = true;
    
    logger.info(`🎉 ENHANCED: Models cache initialized successfully (${Object.keys(models).length} models)`);
    
    return models;
  } catch (error) {
    logger.error('❌ ENHANCED P0 CRITICAL: Failed to initialize models cache:', error);
    throw error;
  }
};

/**
 * Get all models with associations (synchronous after initialization)
 * @returns {Object} Models object with all associations
 */
const getAllModels = () => {
  if (!isInitialized || !modelsCache) {
    logger.error('❌ CRITICAL: Models cache not initialized when getAllModels() was called');
    logger.error('Stack trace:', new Error().stack);
    throw new Error('Models cache not initialized. Call initializeModelsCache() during server startup.');
  }
  
  // Additional validation
  if (!modelsCache.User || !modelsCache.Session) {
    logger.error('❌ CRITICAL: Models cache is corrupted - missing core models');
    throw new Error('Models cache is corrupted - core models missing');
  }
  
  return modelsCache;
};

/**
 * Get specific model with associations (synchronous after initialization)
 * @param {string} modelName - Name of the model to get
 * @returns {Object} Model with associations
 */
const getModel = (modelName) => {
  try {
    const models = getAllModels();
    if (!models[modelName]) {
      logger.error(`❌ CRITICAL: Model '${modelName}' not found in cache. Available models:`, Object.keys(models));
      throw new Error(`Model '${modelName}' not found in cache`);
    }
    return models[modelName];
  } catch (error) {
    logger.error(`❌ CRITICAL: Error getting model '${modelName}':`, error.message);
    throw error;
  }
};

// Export initialization function (for server startup)
export { initializeModelsCache };

// Export main functions
export { getAllModels };
export { getModel };

// 🎯 ENHANCED: Synchronous getter functions for critical models (post-initialization)
export const getCartItem = () => getModel('CartItem');
export const getStorefrontItem = () => getModel('StorefrontItem');
export const getShoppingCart = () => getModel('ShoppingCart');
export const getUser = () => getModel('User');
export const getOrder = () => getModel('Order');
export const getOrderItem = () => getModel('OrderItem');
export const getSession = () => getModel('Session');
export const getSessionType = () => getModel('SessionType');
export const getClientProgress = () => getModel('ClientProgress');
export const getNotification = () => getModel('Notification');
export const getContact = () => getModel('Contact');
export const getFinancialTransaction = () => getModel('FinancialTransaction');
export const getAdminNotification = () => getModel('AdminNotification');
export const getAdminSpecial = () => getModel('AdminSpecial');
export const getPackage = () => getModel('Package');

// Challenge/Gamification Models
export const getChallenge = () => getModel('Challenge');
export const getChallengeParticipant = () => getModel('ChallengeParticipant');
export const getGoal = () => getModel('Goal');
export const getProgressData = () => getModel('ProgressData');
export const getUserFollow = () => getModel('UserFollow');
export const getSessionPackage = () => getModel('SessionPackage');

// Exercise Models
export const getExercise = () => getModel('Exercise');

// Workout Session Models (aliases for compatibility)
export const getWorkoutSession = () => getModel('WorkoutSession');
export const getWorkoutLog = () => getModel('WorkoutLog');

// NASM Workout Tracking Models
export const getClientTrainerAssignment = () => getModel('ClientTrainerAssignment');
export const getTrainerPermissions = () => getModel('TrainerPermissions');
export const getTrainerAvailability = () => getModel('TrainerAvailability');
export const getDailyWorkoutForm = () => getModel('DailyWorkoutForm');
export const getAdminSettings = () => getModel('AdminSettings');
export const getAutomationSequence = () => getModel('AutomationSequence');
export const getAutomationLog = () => getModel('AutomationLog');

// AI Privacy Models
export const getAiPrivacyProfile = () => getModel('AiPrivacyProfile');
export const getAiInteractionLog = () => getModel('AiInteractionLog');

// AI Monitoring Models (Phase 10)
export const getAiMetricsBucket = () => getModel('AiMetricsBucket');
export const getAiMonitoringAlert = () => getModel('AiMonitoringAlert');

// Long-Horizon Planning Models (Phase 5C)
export const getLongTermProgramPlan = () => getModel('LongTermProgramPlan');
export const getProgramMesocycleBlock = () => getModel('ProgramMesocycleBlock');

// Waiver + Consent Models (Phase 5W-B)
export const getWaiverVersion = () => getModel('WaiverVersion');
export const getWaiverRecord = () => getModel('WaiverRecord');
export const getWaiverRecordVersion = () => getModel('WaiverRecordVersion');
export const getWaiverConsentFlags = () => getModel('WaiverConsentFlags');
export const getPendingWaiverMatch = () => getModel('PendingWaiverMatch');
export const getAiConsentLog = () => getModel('AiConsentLog');

// Body Measurement & Milestone Models (Phase 11)
export const getBodyMeasurement = () => getModel('BodyMeasurement');
export const getMeasurementMilestone = () => getModel('MeasurementMilestone');

// Pain/Injury Tracking (NASM CES + Squat University)
export const getClientPainEntry = () => getModel('ClientPainEntry');

// Video Catalog Models
export const getVideoCatalog = () => getModel('VideoCatalog');
export const getVideoCollection = () => getModel('VideoCollection');
export const getVideoCollectionItem = () => getModel('VideoCollectionItem');
export const getUserWatchHistory = () => getModel('UserWatchHistory');
export const getVideoAccessGrant = () => getModel('VideoAccessGrant');
export const getVideoOutboundClick = () => getModel('VideoOutboundClick');
export const getVideoJobLog = () => getModel('VideoJobLog');

// Export Sequelize operators for routes
export { Op };

// Legacy exports for backward compatibility
export { default } from './associations.mjs';
export { default as getModels } from './associations.mjs';
export { default as getDB } from './associations.mjs';
