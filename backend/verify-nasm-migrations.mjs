/**
 * NASM Migration Verification Script
 * ==================================
 * 
 * Verifies that the NASM Workout Tracking System tables have been
 * successfully created in production PostgreSQL database.
 * 
 * PRODUCTION SAFETY: Read-only verification only
 */

import { getAllModels } from './models/index.mjs';
import logger from './utils/logger.mjs';

const verifyNASMMigrations = async () => {
  try {
    console.log('🔍 Starting NASM Migration Verification...');
    console.log('Environment:', process.env.NODE_ENV);
    
    // Get models with full associations
    const models = await getAllModels();
    
    console.log('\n📋 Verifying Table Creation:');
    
    // Test 1: ClientTrainerAssignment table
    try {
      const assignmentCount = await models.ClientTrainerAssignment.count();
      console.log('✅ client_trainer_assignments table exists (records:', assignmentCount, ')');
    } catch (error) {
      console.error('❌ client_trainer_assignments table MISSING or inaccessible');
      throw error;
    }
    
    // Test 2: TrainerPermissions table
    try {
      const permissionCount = await models.TrainerPermissions.count();
      console.log('✅ trainer_permissions table exists (records:', permissionCount, ')');
    } catch (error) {
      console.error('❌ trainer_permissions table MISSING or inaccessible');
      throw error;
    }
    
    // Test 3: DailyWorkoutForm table
    try {
      const formCount = await models.DailyWorkoutForm.count();
      console.log('✅ daily_workout_forms table exists (records:', formCount, ')');
    } catch (error) {
      console.error('❌ daily_workout_forms table MISSING or inaccessible');
      throw error;
    }
    
    console.log('\n📋 Verifying Model Associations:');
    
    // Test 4: Association verification
    const associationTests = {
      'ClientTrainerAssignment.client': models.ClientTrainerAssignment.associations.client,
      'ClientTrainerAssignment.trainer': models.ClientTrainerAssignment.associations.trainer,
      'TrainerPermissions.trainer': models.TrainerPermissions.associations.trainer,
      'DailyWorkoutForm.client': models.DailyWorkoutForm.associations.client,
      'DailyWorkoutForm.trainer': models.DailyWorkoutForm.associations.trainer,
      'User.clientAssignments': models.User.associations.clientAssignments,
      'User.permissions': models.User.associations.permissions,
      'User.workoutForms': models.User.associations.workoutForms
    };
    
    let associationErrors = 0;
    for (const [associationName, association] of Object.entries(associationTests)) {
      if (association) {
        console.log(`✅ ${associationName} association exists`);
      } else {
        console.error(`❌ ${associationName} association MISSING`);
        associationErrors++;
      }
    }
    
    if (associationErrors > 0) {
      throw new Error(`${associationErrors} critical associations are missing`);
    }
    
    console.log('\n🎉 NASM Migration Verification SUCCESSFUL!');
    console.log('✅ All tables created successfully');
    console.log('✅ All associations properly configured');
    console.log('✅ System ready for NASM Workout Tracking functionality');
    
    return {
      success: true,
      tables: {
        clientTrainerAssignments: true,
        trainerPermissions: true,
        dailyWorkoutForms: true
      },
      associations: associationErrors === 0
    };
    
  } catch (error) {
    console.error('\n💥 NASM Migration Verification FAILED!');
    console.error('Error:', error.message);
    
    if (error.name === 'SequelizeConnectionError') {
      console.error('🔥 Database connection failed - check DATABASE_URL');
    } else if (error.name === 'SequelizeDatabaseError') {
      console.error('🔥 Database query failed - tables may not exist');
      console.error('💡 Run: npm run migrate:production');
    }
    
    return {
      success: false,
      error: error.message
    };
  }
};

// Export for use in other scripts
export { verifyNASMMigrations };

// Run verification if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyNASMMigrations()
    .then(result => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Script execution failed:', error);
      process.exit(1);
    });
}
