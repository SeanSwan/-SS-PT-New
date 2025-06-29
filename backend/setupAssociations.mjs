/**
 * Setup Associations - Simple Bridge Module  
 * ==========================================
 * Master Prompt v30 Aligned - Simple bridge using existing proven associations
 * 
 * This file acts as a bridge between server.mjs and the actual associations
 * in models/associations.mjs to maintain compatibility with the server startup.
 */

import getModels from './models/associations.mjs';
import logger from './utils/logger.mjs';

/**
 * Setup database model associations
 * This function is called during server initialization to establish
 * relationships between Sequelize models (PostgreSQL)
 */
const setupAssociations = async () => {
  try {
    logger.info('Initializing Sequelize model associations...');
    
    // Import and setup all model associations using the existing proven system
    const models = await getModels();
    
    if (models) {
      logger.info('✅ Model associations setup completed successfully');
      logger.info(`📋 Loaded ${Object.keys(models).length} Sequelize models`);
      
      // 🎯 CRITICAL P0 VERIFICATION: Ensure CartItem -> StorefrontItem association exists
      if (models.CartItem && models.CartItem.associations && models.CartItem.associations.storefrontItem) {
        logger.info('🎯 P0 CRITICAL FIX VERIFIED: CartItem -> StorefrontItem association confirmed');
      } else {
        logger.warn('⚠️ P0 WARNING: CartItem -> StorefrontItem association not immediately verified');
      }
      
      // Log model names for debugging
      const modelNames = Object.keys(models).join(', ');
      logger.info(`🔗 Available models: ${modelNames}`);
      
      return models;
    } else {
      logger.warn('⚠️ Models setup returned null - this may indicate an issue');
      return null;
    }
  } catch (error) {
    logger.error('❌ Critical error in setupAssociations:', {
      message: error.message,
      stack: error.stack
    });
    
    // Log specific error details for debugging
    if (error.code) {
      logger.error(`Error code: ${error.code}`);
    }
    
    // Re-throw to prevent server startup with broken associations
    throw new Error(`Failed to setup model associations: ${error.message}`);
  }
};

export default setupAssociations;
