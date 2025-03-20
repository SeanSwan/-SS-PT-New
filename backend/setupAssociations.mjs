/**
 * setupAssociations.mjs
 * =====================
 * This file sets up model associations to prevent circular dependencies.
 * Import and call this function after all models are imported but before syncing.
 */

// Import all models that need associations
import { DataTypes } from 'sequelize';
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
    foreignKey: {
      name: 'userId',
      type: DataTypes.INTEGER
    }
  });
  
  Session.belongsTo(User, { 
    as: 'trainer',
    foreignKey: {
      name: 'trainerId',
      type: DataTypes.INTEGER
    }
  });
  
  // ====================================
  // User Associations
  // ====================================
  
  // Sessions
  User.hasMany(Session, { 
    as: 'clientSessions',
    foreignKey: {
      name: 'userId',
      type: DataTypes.INTEGER
    }
  });
  
  User.hasMany(Session, { 
    as: 'trainerSessions',
    foreignKey: {
      name: 'trainerId',
      type: DataTypes.INTEGER
    }
  });
  
  // Shopping Carts
  User.hasMany(ShoppingCart, { 
    as: 'userCarts',
    foreignKey: {
      name: 'userId',
      type: DataTypes.INTEGER
    }
  });
  
  // Orientation Requests
  User.hasMany(Orientation, { 
    as: 'orientations',
    foreignKey: {
      name: 'userId',
      type: DataTypes.INTEGER
    }
  });
  
  // Contact Forms
  User.hasMany(Contact, { 
    as: 'contacts',
    foreignKey: {
      name: 'userId',
      type: DataTypes.INTEGER
    }
  });
  
  // Admin Settings
  User.hasOne(AdminSettings, { 
    as: 'adminSettings',
    foreignKey: {
      name: 'userId',
      type: DataTypes.INTEGER  // Explicitly define INTEGER type to match users.id
    }
  });
  
  // ====================================
  // ShoppingCart Associations
  // ====================================
  
  ShoppingCart.belongsTo(User, { 
    as: 'user',
    foreignKey: {
      name: 'userId',
      type: DataTypes.INTEGER
    }
  });
  
  ShoppingCart.hasMany(CartItem, { 
    as: 'cartItems',
    foreignKey: {
      name: 'cartId',
      type: DataTypes.INTEGER
    }
  });
  
  // ====================================
  // CartItem Associations
  // ====================================
  
  CartItem.belongsTo(ShoppingCart, { 
    as: 'shoppingCart',  // Changed from 'cart' to 'shoppingCart'
    foreignKey: {
      name: 'cartId',
      type: DataTypes.INTEGER
    }
  });
  
  CartItem.belongsTo(StorefrontItem, { 
    as: 'storefrontItem',
    foreignKey: {
      name: 'storefrontItemId',
      type: DataTypes.INTEGER
    }
  });
  
  // ====================================
  // StorefrontItem Associations
  // ====================================
  
  StorefrontItem.hasMany(CartItem, { 
    as: 'relatedCartItems',
    foreignKey: {
      name: 'storefrontItemId',
      type: DataTypes.INTEGER
    }
  });
  
  // ====================================
  // Orientation Associations
  // ====================================
  
  Orientation.belongsTo(User, { 
    as: 'user',
    foreignKey: {
      name: 'userId',
      type: DataTypes.INTEGER
    }
  });
  
  // ====================================
  // Contact Associations
  // ====================================
  
  Contact.belongsTo(User, { 
    as: 'user',
    foreignKey: {
      name: 'userId',
      type: DataTypes.INTEGER
    }
  });
  
  // ====================================
  // AdminSettings Associations
  // ====================================
  
  AdminSettings.belongsTo(User, { 
    as: 'admin',
    foreignKey: {
      name: 'userId',
      type: DataTypes.INTEGER  // Explicitly define INTEGER type to match users.id
    }
  });
  
  console.log('✅ Model associations set up successfully');
};

export default setupAssociations;