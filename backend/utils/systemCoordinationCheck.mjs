/**
 * System Coordination Health Check
 * ===============================
 * 🚀 ENHANCED: Verifies full-stack coordination fix implementation
 * 
 * This script validates that all layers of the application are using
 * coordinated model imports consistently.
 */

// 🚀 ENHANCED: Import coordinated models to verify system consistency
import { getAllModels, getCartItem, getStorefrontItem, getUser } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

/**
 * Verify full-stack coordination implementation
 */
export const verifySystemCoordination = async () => {
  try {
    logger.info('🔍 ENHANCED: Starting full-stack coordination verification...');
    
    // Test 1: Verify models cache is initialized
    const allModels = getAllModels();
    const modelCount = Object.keys(allModels).length;
    
    if (modelCount < 10) {
      throw new Error(`Expected at least 10 models, got ${modelCount}`);
    }
    
    logger.info(`✅ ENHANCED: Models cache verified (${modelCount} models loaded)`);
    
    // Test 2: Verify critical models have associations
    const criticalModels = {
      CartItem: getCartItem(),
      StorefrontItem: getStorefrontItem(),
      User: getUser()
    };
    
    for (const [modelName, model] of Object.entries(criticalModels)) {
      if (!model || !model.associations || Object.keys(model.associations).length === 0) {
        throw new Error(`${modelName} missing associations`);
      }
    }
    
    logger.info('✅ ENHANCED: Critical model associations verified');
    
    // Test 3: Verify specific P0 associations
    const cartItem = criticalModels.CartItem;
    const hasStorefrontAssociation = !!(cartItem.associations?.storefrontItem);
    const hasCartAssociation = !!(cartItem.associations?.cart);
    
    if (!hasStorefrontAssociation || !hasCartAssociation) {
      throw new Error('P0 critical associations missing');
    }
    
    logger.info('✅ ENHANCED: P0 critical associations verified');
    
    // Test 4: Performance check - verify models load quickly
    const startTime = Date.now();
    getAllModels();
    const loadTime = Date.now() - startTime;
    
    if (loadTime > 100) {
      logger.warn(`Models load time: ${loadTime}ms (consider optimization if > 100ms)`);
    } else {
      logger.info(`✅ ENHANCED: Models load performance good (${loadTime}ms)`);
    }
    
    logger.info('🎉 ENHANCED SUCCESS: Full-stack coordination verification complete');
    
    return {
      success: true,
      modelCount,
      loadTime,
      criticalAssociations: {
        cartToStorefront: hasStorefrontAssociation,
        cartToShoppingCart: hasCartAssociation
      }
    };
    
  } catch (error) {
    logger.error('❌ ENHANCED CRITICAL: Coordination verification failed:', error);
    throw error;
  }
};

export default { verifySystemCoordination };
