/**
 * Setup Associations - Production-Safe Bridge Module
 * ==================================================
 * Master Prompt v30 Aligned - Bridge to centralized model system
 * 
 * This file ensures the centralized model system from models/index.mjs
 * is properly initialized and returns the associated models for use
 * throughout the application.
 */

import { getDB } from './models/index.mjs';
import logger from './utils/logger.mjs';

/**
 * Setup database model associations
 * Now acts as a bridge to the centralized model system
 */
const setupAssociations = async () => {
  try {
    logger.info('🔗 Initializing centralized model system...');
    
    // Get the fully initialized database object from centralized index
    const db = await getDB();
    
    if (db && db.sequelize) {
      logger.info('✅ Centralized model system initialized successfully');
      
      // Count available models (excluding sequelize and Sequelize)
      const modelNames = Object.keys(db).filter(key => 
        key !== 'sequelize' && 
        key !== 'Sequelize' && 
        typeof db[key] === 'function' && 
        db[key].tableName
      );
      
      logger.info(`📋 Models available: ${modelNames.length} total`);
      logger.info(`🔍 Key models: ${['User', 'CartItem', 'StorefrontItem', 'ShoppingCart'].filter(name => db[name]).join(', ')}`);
      
      // 🎯 CRITICAL P0 VERIFICATION: Ensure CartItem -> StorefrontItem association exists
      if (db.CartItem && db.CartItem.associations && db.CartItem.associations.storefrontItem) {
        logger.info('🎯 P0 CRITICAL FIX VERIFIED: CartItem -> StorefrontItem association confirmed');
        logger.info(`📊 CartItem associations: ${Object.keys(db.CartItem.associations).join(', ')}`);
      } else {
        logger.error('❌ P0 CRITICAL ISSUE: CartItem -> StorefrontItem association missing!');
        
        // Log detailed debugging info
        if (db.CartItem) {
          logger.error(`CartItem exists but associations: ${Object.keys(db.CartItem.associations || {}).join(', ') || 'NONE'}`);
        } else {
          logger.error('CartItem model not found in database object');
        }
        
        throw new Error('Critical P0 association verification failed');
      }
      
      // Additional association verifications
      if (db.ShoppingCart && db.ShoppingCart.associations && db.ShoppingCart.associations.cartItems) {
        logger.info('✅ ShoppingCart -> cartItems association verified');
      } else {
        logger.warn('⚠️ ShoppingCart -> cartItems association not found');
      }
      
      logger.info('🚀 All critical associations verified for checkout functionality');
      
      return db;
    } else {
      logger.error('❌ Centralized model system failed to initialize properly');
      throw new Error('Model initialization returned invalid result');
    }
  } catch (error) {
    logger.error('❌ Critical error in setupAssociations:', {
      message: error.message,
      stack: error.stack
    });
    
    throw new Error(`Failed to setup model associations: ${error.message}`);
  }
};

export default setupAssociations;
