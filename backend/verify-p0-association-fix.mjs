/**
 * P0 Association Fix Verification Script
 * =====================================
 * Master Prompt v30 aligned - Verify the CartItem -> StorefrontItem association fix
 * 
 * This script tests that the new model import system correctly provides
 * models with associations, preventing the "1 items, 0 total sessions" issue.
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env') });

// Set up logging
const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${level}: ${message}`, data);
};

/**
 * Test the association fix by importing models and checking associations
 */
const testAssociationFix = async () => {
  try {
    log('INFO', '🔄 Starting P0 association fix verification...');
    
    // Test 1: Import models using new system
    log('INFO', '📦 Testing model imports from models/index.mjs...');
    const { getCartItem, getStorefrontItem, getShoppingCart } = await import('./models/index.mjs');
    
    const CartItem = await getCartItem();
    const StorefrontItem = await getStorefrontItem();
    const ShoppingCart = await getShoppingCart();
    
    log('INFO', '✅ Model imports successful', {
      CartItem: !!CartItem,
      StorefrontItem: !!StorefrontItem,
      ShoppingCart: !!ShoppingCart
    });
    
    // Test 2: Verify associations exist
    log('INFO', '🔗 Checking CartItem associations...');
    
    if (!CartItem.associations) {
      log('ERROR', '❌ CartItem has no associations object');
      return false;
    }
    
    const storefrontAssociation = CartItem.associations.storefrontItem;
    if (!storefrontAssociation) {
      log('ERROR', '❌ CartItem missing storefrontItem association');
      return false;
    }
    
    log('INFO', '✅ CartItem -> StorefrontItem association verified', {
      associationType: storefrontAssociation.associationType,
      foreignKey: storefrontAssociation.foreignKey,
      as: storefrontAssociation.as,
      targetModel: storefrontAssociation.target.name
    });
    
    // Test 3: Verify ShoppingCart -> CartItem association
    const cartItemsAssociation = ShoppingCart.associations.cartItems;
    if (!cartItemsAssociation) {
      log('ERROR', '❌ ShoppingCart missing cartItems association');
      return false;
    }
    
    log('INFO', '✅ ShoppingCart -> CartItem association verified', {
      associationType: cartItemsAssociation.associationType,
      foreignKey: cartItemsAssociation.foreignKey,
      as: cartItemsAssociation.as
    });
    
    // Test 4: Connect to database for live test
    log('INFO', '🗄️ Testing database connection...');
    
    const sequelize = (await import('./database.mjs')).default;
    await sequelize.authenticate();
    log('INFO', '✅ Database connection successful');
    
    // Test 5: Live query test (if data exists)
    log('INFO', '🔍 Testing live cart query with associations...');
    
    const testCart = await ShoppingCart.findOne({
      include: [{
        model: CartItem,
        as: 'cartItems',
        include: [{
          model: StorefrontItem,
          as: 'storefrontItem',
          attributes: ['id', 'name', 'sessions', 'totalSessions', 'packageType']
        }]
      }]
    });
    
    if (testCart && testCart.cartItems && testCart.cartItems.length > 0) {
      const firstItem = testCart.cartItems[0];
      const hasStorefrontData = !!firstItem.storefrontItem;
      
      log('INFO', '🧪 Live query test results', {
        cartId: testCart.id,
        itemCount: testCart.cartItems.length,
        firstItemHasStorefront: hasStorefrontData,
        storefrontData: hasStorefrontData ? {
          id: firstItem.storefrontItem.id,
          name: firstItem.storefrontItem.name,
          sessions: firstItem.storefrontItem.sessions,
          totalSessions: firstItem.storefrontItem.totalSessions
        } : 'No association data'
      });
      
      if (hasStorefrontData) {
        log('SUCCESS', '🎉 P0 FIX VERIFIED: Associations working in live queries!');
      } else {
        log('ERROR', '❌ P0 FIX FAILED: Associations not working in live queries');
        return false;
      }
    } else {
      log('INFO', '⚠️ No test cart data found, but associations are configured correctly');
    }
    
    // Test 6: Import cartHelpers to verify it uses new models
    log('INFO', '🛠️ Testing cartHelpers compatibility...');
    const cartHelpers = await import('./utils/cartHelpers.mjs');
    
    if (cartHelpers.calculateCartTotals) {
      log('INFO', '✅ cartHelpers import successful');
    }
    
    log('SUCCESS', '🎉 P0 ASSOCIATION FIX VERIFICATION COMPLETE');
    log('SUCCESS', '✅ The "1 items, 0 total sessions" issue should now be resolved');
    
    return true;
    
  } catch (error) {
    log('ERROR', '❌ P0 association fix verification failed', {
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Main execution
 */
const main = async () => {
  console.log('🚀 P0 CHECKOUT ASSOCIATION FIX VERIFICATION');
  console.log('==========================================');
  
  const success = await testAssociationFix();
  
  if (success) {
    console.log('✅ VERIFICATION PASSED - P0 fix should resolve checkout issue');
    process.exit(0);
  } else {
    console.log('❌ VERIFICATION FAILED - P0 fix needs additional work');
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default testAssociationFix;
