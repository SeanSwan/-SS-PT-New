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
    throw new Error('Models cache not initialized. Call initializeModelsCache() during server startup.');
  }
  return modelsCache;
};

/**
 * Get specific model with associations (synchronous after initialization)
 * @param {string} modelName - Name of the model to get
 * @returns {Object} Model with associations
 */
const getModel = (modelName) => {
  const models = getAllModels();
  if (!models[modelName]) {
    throw new Error(`Model '${modelName}' not found in cache`);
  }
  return models[modelName];
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
export const getClientProgress = () => getModel('ClientProgress');
export const getNotification = () => getModel('Notification');
export const getContact = () => getModel('Contact');
export const getFinancialTransaction = () => getModel('FinancialTransaction');
export const getAdminNotification = () => getModel('AdminNotification');

// Legacy exports for backward compatibility
export { default } from './associations.mjs';
export { default as getModels } from './associations.mjs';
export { default as getDB } from './associations.mjs';
