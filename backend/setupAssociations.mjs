/**
 * setupAssociations.mjs
 * =====================
 * This file sets up model associations to prevent circular dependencies.
 * Import and call this function after all models are imported but before syncing.
 */

// Import all models that need associations
import User from './models/User.mjs';
import Session from './models/Session.mjs';
import ShoppingCart from './models/ShoppingCart.mjs';
import CartItem from './models/CartItem.mjs';
import StorefrontItem from './models/StorefrontItem.mjs';
import AdminSettings from './models/AdminSettings.mjs';
import Contact from './models/contact.mjs';
import Orientation from './models/Orientation.mjs';

/**
 * Sets up all model associations to ensure proper relationships
 * between database tables.
 */
const setupAssociations = () => {
  console.log('Setting up model associations...');
  
  // ====================================
  // Session Associations
  // ====================================
  
  Session.belongsTo(User, { 
    as: 'client',
    foreignKey: 'userId'
  });
  
  Session.belongsTo(User, { 
    as: 'trainer',
    foreignKey: 'trainerId'
  });
  
  // ====================================
  // User Associations
  // ====================================
  
  // Sessions
  User.hasMany(Session, { 
    as: 'clientSessions',
    foreignKey: 'userId'
  });
  
  User.hasMany(Session, { 
    as: 'trainerSessions',
    foreignKey: 'trainerId'
  });
  
  // Shopping Carts
  User.hasMany(ShoppingCart, { 
    as: 'userCarts',
    foreignKey: 'userId' 
  });
  
  // Orientation Requests
  User.hasMany(Orientation, { 
    as: 'orientations',
    foreignKey: 'userId' 
  });
  
  // Contact Forms
  User.hasMany(Contact, { 
    as: 'contacts',
    foreignKey: 'userId' 
  });
  
  // Admin Settings
  User.hasOne(AdminSettings, { 
    as: 'adminSettings',
    foreignKey: 'userId' 
  });
  
  // ====================================
  // ShoppingCart Associations
  // ====================================
  
  ShoppingCart.belongsTo(User, { 
    as: 'user',
    foreignKey: 'userId' 
  });
  
  ShoppingCart.hasMany(CartItem, { 
    as: 'cartItems',
    foreignKey: 'cartId' 
  });
  
  // ====================================
  // CartItem Associations
  // ====================================
  
  CartItem.belongsTo(ShoppingCart, { 
    as: 'shoppingCart',  // Changed from 'cart' to 'shoppingCart'
    foreignKey: 'cartId' 
  });
  
  CartItem.belongsTo(StorefrontItem, { 
    as: 'storefrontItem',
    foreignKey: 'storefrontItemId' 
  });
  
  // ====================================
  // StorefrontItem Associations
  // ====================================
  
  StorefrontItem.hasMany(CartItem, { 
    as: 'relatedCartItems',
    foreignKey: 'storefrontItemId' 
  });
  
  // ====================================
  // Orientation Associations
  // ====================================
  
  Orientation.belongsTo(User, { 
    as: 'user',
    foreignKey: 'userId' 
  });
  
  // ====================================
  // Contact Associations
  // ====================================
  
  Contact.belongsTo(User, { 
    as: 'user',
    foreignKey: 'userId' 
  });
  
  // ====================================
  // AdminSettings Associations
  // ====================================
  
  AdminSettings.belongsTo(User, { 
    as: 'admin',
    foreignKey: 'userId' 
  });
  
  console.log('✅ Model associations set up successfully');
};

export default setupAssociations;