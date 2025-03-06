/**
 * setupAssociations.mjs
 * =====================
 * This file sets up model associations to prevent circular dependencies.
 * Import and call this function after all models are imported but before syncing.
 */

// Import all models that need associations
import User from './models/User.mjs';
import Session from './models/Session.mjs';

/**
 * Sets up all model associations to ensure proper relationships
 * between database tables.
 */
const setupAssociations = () => {
  // Session associations
  Session.belongsTo(User, { 
    as: 'client',
    foreignKey: 'userId'
  });
  
  Session.belongsTo(User, { 
    as: 'trainer',
    foreignKey: 'trainerId'
  });
  
  // User associations
  User.hasMany(Session, { 
    as: 'clientSessions',
    foreignKey: 'userId'
  });
  
  User.hasMany(Session, { 
    as: 'trainerSessions',
    foreignKey: 'trainerId'
  });
  
  console.log('✅ Model associations set up successfully');
};

export default setupAssociations;