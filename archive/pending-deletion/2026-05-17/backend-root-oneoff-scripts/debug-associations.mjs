/**
 * Debug script to identify duplicate association aliases
 */

import logger from './utils/logger.mjs';

const setupAssociations = async () => {
  try {
    console.log('🔍 DEBUG: Starting association analysis...');
    
    // Import ONLY SEQUELIZE MODELS (PostgreSQL)
    const UserModule = await import('./models/User.mjs');
    const ClientProgressModule = await import('./models/ClientProgress.mjs');
    
    const User = UserModule.default;
    const ClientProgress = ClientProgressModule.default;
    
    console.log('🔍 DEBUG: Models loaded successfully');
    console.log('🔍 DEBUG: User associations before setup:', Object.keys(User.associations || {}));
    console.log('🔍 DEBUG: ClientProgress associations before setup:', Object.keys(ClientProgress.associations || {}));
    
    // Try to set up the association and catch the exact error
    try {
      console.log('🔍 DEBUG: Setting up User.hasOne(ClientProgress, { foreignKey: "userId", as: "clientProgress" })');
      User.hasOne(ClientProgress, { foreignKey: 'userId', as: 'clientProgress' });
      console.log('✅ DEBUG: First association set up successfully');
    } catch (error) {
      console.error('❌ DEBUG: Error on first association setup:', error.message);
      throw error;
    }
    
    console.log('🔍 DEBUG: User associations after first setup:', Object.keys(User.associations || {}));
    
    // Try to set up the reverse association
    try {
      console.log('🔍 DEBUG: Setting up ClientProgress.belongsTo(User, { foreignKey: "userId", as: "user" })');
      ClientProgress.belongsTo(User, { foreignKey: 'userId', as: 'user' });
      console.log('✅ DEBUG: Reverse association set up successfully');
    } catch (error) {
      console.error('❌ DEBUG: Error on reverse association setup:', error.message);
      throw error;
    }
    
    // Try to set up the same association again to reproduce the error
    try {
      console.log('🔍 DEBUG: Attempting to set up the same association again to reproduce error...');
      User.hasOne(ClientProgress, { foreignKey: 'userId', as: 'clientProgress' });
      console.log('⚠️ DEBUG: Second identical association succeeded - this should not happen');
    } catch (error) {
      console.error('❌ DEBUG: Error on duplicate association (expected):', error.message);
      console.log('🔍 DEBUG: This is likely the root cause of the production error');
    }
    
    console.log('🔍 DEBUG: Final User associations:', Object.keys(User.associations || {}));
    console.log('🔍 DEBUG: Final ClientProgress associations:', Object.keys(ClientProgress.associations || {}));
    
  } catch (error) {
    console.error('❌ DEBUG: Association debug failed:', error);
    throw error;
  }
};

// Run the debug
setupAssociations().catch(console.error);
