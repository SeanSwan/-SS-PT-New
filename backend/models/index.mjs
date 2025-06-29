/**
 * SwanStudios Models Index - Centralized Model Export with Associations
 * ====================================================================
 * Master Prompt v30 aligned - P0 checkout fix implementation
 * 
 * This file exports models WITH associations already established,
 * preventing the runtime association mismatch that caused the
 * "1 items, 0 total sessions" checkout blocker.
 * 
 * CRITICAL: All route files MUST import models from this index.mjs
 * to ensure associations are available at runtime.
 */

import logger from '../utils/logger.mjs';

// Import the associations setup function
import getModels from './associations.mjs';

// Singleton pattern to ensure models are initialized once
let modelsWithAssociations = null;
let initializationPromise = null;

/**
 * Get models with associations established
 * @returns {Promise<Object>} Models object with all associations
 */
const getModelsWithAssociations = async () => {
  // Return existing models if already initialized
  if (modelsWithAssociations) {
    return modelsWithAssociations;
  }
  
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return await initializationPromise;
  }
  
  // Start initialization
  initializationPromise = (async () => {
    try {
      logger.info('🔗 P0 FIX: Initializing models with associations for runtime usage...');
      
      const models = await getModels();
      
      if (!models) {
        throw new Error('Failed to get models from associations.mjs');
      }
      
      // 🎯 CRITICAL P0 VERIFICATION: Ensure CartItem -> StorefrontItem association exists
      if (models.CartItem && models.CartItem.associations && models.CartItem.associations.storefrontItem) {
        logger.info('✅ P0 CRITICAL FIX: CartItem -> StorefrontItem association verified in models/index.mjs');
      } else {
        logger.error('❌ P0 CRITICAL ERROR: CartItem -> StorefrontItem association missing in models/index.mjs');
        throw new Error('Critical association missing: CartItem -> StorefrontItem');
      }
      
      // Store models for reuse
      modelsWithAssociations = models;
      
      logger.info(`🎉 P0 FIX: Models with associations ready for runtime (${Object.keys(models).length} models)`);
      
      return models;
    } catch (error) {
      logger.error('❌ P0 CRITICAL: Failed to initialize models with associations:', error);
      initializationPromise = null; // Reset for retry
      throw error;
    }
  })();
  
  return await initializationPromise;
};

/**
 * Get specific model with associations
 * @param {string} modelName - Name of the model to get
 * @returns {Promise<Object>} Model with associations
 */
const getModel = async (modelName) => {
  const models = await getModelsWithAssociations();
  return models[modelName];
};

// Export function to get models with associations
export { getModelsWithAssociations as getAllModels };
export { getModel };

// Export specific getter functions for critical models
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

// Legacy exports for compatibility
export { default } from './associations.mjs';
export { default as getModels } from './associations.mjs';
export { default as getDB } from './associations.mjs';
