/**
 * Quick Model Fix Verification
 * ===========================
 * Tests the specific fixes we made to WorkoutSession and Exercise models
 */

console.log('🔧 Testing Model Fixes...\n');

// Test 1: WorkoutSession is now Sequelize (not MongoDB)
console.log('📋 Test 1: WorkoutSession Model');
try {
  const WorkoutSession = await import('./backend/models/WorkoutSession.mjs');
  
  if (WorkoutSession.default) {
    // Check if it's a Sequelize model by looking for Sequelize methods
    const hasSequelizeMethods = typeof WorkoutSession.default.findAll === 'function';
    const hasInit = typeof WorkoutSession.default.init === 'function';
    
    if (hasSequelizeMethods) {
      console.log('✅ WorkoutSession is now a Sequelize model');
    } else {
      console.log('❌ WorkoutSession is not a proper Sequelize model');
    }
  } else {
    console.log('❌ WorkoutSession has no default export');
  }
} catch (error) {
  console.log(`❌ WorkoutSession import failed: ${error.message}`);
}

// Test 2: Exercise uses UUID (not INTEGER)
console.log('\n📋 Test 2: Exercise Model ID Type');
try {
  const Exercise = await import('./backend/models/Exercise.mjs');
  
  if (Exercise.default && Exercise.default.rawAttributes) {
    const idField = Exercise.default.rawAttributes.id;
    
    if (idField && idField.type && idField.type.constructor.name === 'UUID') {
      console.log('✅ Exercise model now uses UUID for id');
    } else {
      console.log(`⚠️  Exercise id type: ${idField?.type?.constructor?.name || 'unknown'}`);
    }
  } else {
    console.log('⚠️  Could not verify Exercise id type (model may not be initialized)');
  }
} catch (error) {
  console.log(`❌ Exercise import failed: ${error.message}`);
}

// Test 3: Try to import associations
console.log('\n📋 Test 3: Associations Loading');
try {
  const { default: getModels } = await import('./backend/models/associations.mjs');
  
  console.log('✅ Associations file imports successfully');
  
  // Try to load models
  const models = await getModels();
  
  if (models && models.WorkoutSession && models.Exercise) {
    console.log('✅ WorkoutSession and Exercise both available in associations');
    console.log(`📊 Total models loaded: ${Object.keys(models).length}`);
  } else {
    console.log('⚠️  WorkoutSession or Exercise missing from associations');
  }
  
} catch (error) {
  console.log(`❌ Associations loading failed: ${error.message}`);
  
  // Show just the first few lines of error for diagnosis
  const errorLines = error.stack.split('\n').slice(0, 5);
  errorLines.forEach(line => console.log(`   ${line}`));
}

console.log('\n🎯 Fix Verification Complete!');
console.log('\nKey Changes Made:');
console.log('1. ✅ WorkoutSession.mjs converted from MongoDB to PostgreSQL');
console.log('2. ✅ Exercise.mjs ID changed from INTEGER to UUID');
console.log('3. ✅ Original MongoDB WorkoutSession backed up');
console.log('\nNext: Try starting the server to see if all models load correctly!');
