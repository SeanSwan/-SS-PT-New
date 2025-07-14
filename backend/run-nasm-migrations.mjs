/**
 * NASM Migration Runner
 * ====================
 * 
 * Runs the three new migrations for the NASM Workout Tracking System.
 * Safe for production deployment with comprehensive error handling.
 * 
 * Part of Phase 2.2: API Layer - Database Migration Deployment
 * Designed for SwanStudios Platform - Production Ready
 */

import sequelize from './database.mjs';
import logger from './utils/logger.mjs';

const runNASMMigrations = async () => {
  try {
    logger.info('🚀 Starting NASM Workout Tracking System migrations...');

    // Test database connection first
    await sequelize.authenticate();
    logger.info('✅ Database connection verified');

    // Get query interface
    const queryInterface = sequelize.getQueryInterface();

    // Check if migrations have already been run
    const tables = await queryInterface.showAllTables();
    
    const existingTables = {
      clientTrainerAssignments: tables.includes('client_trainer_assignments'),
      trainerPermissions: tables.includes('trainer_permissions'),
      dailyWorkoutForms: tables.includes('daily_workout_forms')
    };

    logger.info('📊 Migration status check:', existingTables);

    // Run migrations if tables don't exist
    if (!existingTables.clientTrainerAssignments) {
      logger.info('🔧 Running ClientTrainerAssignment migration...');
      
      // Import and run the migration manually
      const migration1 = await import('./migrations/20250714000000-create-client-trainer-assignments.cjs');
      await migration1.default.up(queryInterface, sequelize.Sequelize);
      
      logger.info('✅ ClientTrainerAssignment table created successfully');
    } else {
      logger.info('⏭️  ClientTrainerAssignment table already exists, skipping...');
    }

    if (!existingTables.trainerPermissions) {
      logger.info('🔧 Running TrainerPermissions migration...');
      
      const migration2 = await import('./migrations/20250714000001-create-trainer-permissions.cjs');
      await migration2.default.up(queryInterface, sequelize.Sequelize);
      
      logger.info('✅ TrainerPermissions table created successfully');
    } else {
      logger.info('⏭️  TrainerPermissions table already exists, skipping...');
    }

    if (!existingTables.dailyWorkoutForms) {
      logger.info('🔧 Running DailyWorkoutForm migration...');
      
      const migration3 = await import('./migrations/20250714000002-create-daily-workout-forms.cjs');
      await migration3.default.up(queryInterface, sequelize.Sequelize);
      
      logger.info('✅ DailyWorkoutForm table created successfully');
    } else {
      logger.info('⏭️  DailyWorkoutForm table already exists, skipping...');
    }

    // Verify all tables now exist
    const finalTables = await queryInterface.showAllTables();
    const finalStatus = {
      clientTrainerAssignments: finalTables.includes('client_trainer_assignments'),
      trainerPermissions: finalTables.includes('trainer_permissions'),
      dailyWorkoutForms: finalTables.includes('daily_workout_forms')
    };

    logger.info('🎯 Final migration status:', finalStatus);

    const allTablesCreated = Object.values(finalStatus).every(status => status === true);

    if (allTablesCreated) {
      logger.info('🎉 NASM Workout Tracking System migrations completed successfully!');
      logger.info('📋 Summary:');
      logger.info('   ✅ client_trainer_assignments - Admin-controlled client-trainer relationships');
      logger.info('   ✅ trainer_permissions - Granular trainer permission system');
      logger.info('   ✅ daily_workout_forms - Comprehensive workout form data with MCP integration');
      
      return { success: true, message: 'All migrations completed successfully' };
    } else {
      throw new Error('Some migrations failed to create tables');
    }

  } catch (error) {
    logger.error('❌ NASM migrations failed:', error);
    throw error;
  }
};

// If run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runNASMMigrations()
    .then((result) => {
      console.log('✅ Migration completed:', result.message);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    });
}

export default runNASMMigrations;