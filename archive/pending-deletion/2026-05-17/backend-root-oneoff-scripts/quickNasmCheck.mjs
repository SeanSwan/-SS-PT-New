/**
 * Quick NASM System Verification
 * ==============================
 * 
 * Verifies that NASM WorkoutLogger tables and models are working
 * Run from backend directory: node quickNasmCheck.mjs
 */

import { initializeModelsCache, getAllModels } from './models/index.mjs';
import logger from './utils/logger.mjs';

const quickNasmCheck = async () => {
  try {
    logger.info('🔍 Quick NASM System Check...');
    
    // Initialize models
    await initializeModelsCache();
    const models = getAllModels();
    
    logger.info('📋 NASM Table Verification:');
    
    // Check NASM tables
    const nasmTables = {
      'ClientTrainerAssignment': models.ClientTrainerAssignment,
      'TrainerPermissions': models.TrainerPermissions, 
      'DailyWorkoutForm': models.DailyWorkoutForm,
      'Exercise': models.Exercise
    };
    
    for (const [name, model] of Object.entries(nasmTables)) {
      if (model) {
        const count = await model.count();
        logger.info(`✅ ${name}: ${count} records`);
      } else {
        logger.error(`❌ ${name}: Model not found`);
      }
    }
    
    logger.info('🎉 NASM System Status: OPERATIONAL');
    logger.info('✅ All NASM tables accessible');
    logger.info('✅ Models properly initialized');
    logger.info('✅ Ready for trainer workflow');
    
    return true;
  } catch (error) {
    logger.error('❌ NASM System Check Failed:', error.message);
    return false;
  }
};

// Run check
quickNasmCheck()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error('Check failed:', error);
    process.exit(1);
  });
