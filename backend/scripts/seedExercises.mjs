/**
 * Exercise Seeding Script
 * ======================
 * 
 * Seeds the Exercise table with basic NASM-compliant exercises
 * for testing the WorkoutLogger functionality.
 * 
 * Run with: node backend/scripts/seedExercises.mjs
 */

import { getAllModels, initializeModelsCache } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

const basicExercises = [
  {
    name: 'Barbell Back Squat',
    description: 'A compound movement that targets the quadriceps, glutes, and core. Fundamental strength exercise for lower body development.',
    instructions: '1. Set barbell on rack at chest height\n2. Position bar on upper traps\n3. Step back and set feet shoulder-width apart\n4. Lower by pushing hips back and bending knees\n5. Descend until thighs parallel to floor\n6. Drive through heels to return to start',
    exerciseType: 'compound',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Core', 'Calves', 'Hamstrings'],
    difficulty: 300,
    progressionPath: 'beginner_to_intermediate'
  },
  {
    name: 'Deadlift',
    description: 'The king of compound movements. Full-body exercise targeting posterior chain with emphasis on hamstrings, glutes, and back.',
    instructions: '1. Stand with feet hip-width apart, bar over mid-foot\n2. Hinge at hips and bend knees to grab bar\n3. Keep chest up and back straight\n4. Drive through heels and extend hips to lift\n5. Stand tall with shoulders back\n6. Reverse movement to lower bar',
    exerciseType: 'compound',
    primaryMuscles: ['Hamstrings', 'Glutes', 'Erector Spinae'],
    secondaryMuscles: ['Quadriceps', 'Traps', 'Rhomboids', 'Lats', 'Core'],
    difficulty: 400,
    progressionPath: 'intermediate_to_advanced'
  },
  {
    name: 'Push-ups',
    description: 'Classic bodyweight exercise targeting chest, shoulders, and triceps. Excellent for building upper body strength and endurance.',
    instructions: '1. Start in plank position with hands under shoulders\n2. Keep body straight from head to heels\n3. Lower chest toward ground by bending elbows\n4. Keep elbows close to body\n5. Push back up to starting position\n6. Maintain straight line throughout',
    exerciseType: 'calisthenics',
    primaryMuscles: ['Chest', 'Triceps'],
    secondaryMuscles: ['Shoulders', 'Core'],
    difficulty: 150,
    progressionPath: 'beginner_to_intermediate'
  },
  {
    name: 'Plank',
    description: 'Isometric core stabilization exercise. Builds core strength and stability while improving posture.',
    instructions: '1. Start in forearm plank position\n2. Keep body straight from head to heels\n3. Engage core and glutes\n4. Breathe normally while holding position\n5. Keep hips level, avoid sagging or piking\n6. Hold for prescribed time',
    exerciseType: 'core',
    primaryMuscles: ['Core'],
    secondaryMuscles: ['Shoulders', 'Glutes'],
    difficulty: 100,
    progressionPath: 'beginner_to_intermediate'
  },
  {
    name: 'Dumbbell Bench Press',
    description: 'Upper body pressing movement targeting chest, shoulders, and triceps. Allows for greater range of motion than barbell version.',
    instructions: '1. Lie on bench with dumbbells in hands\n2. Start with weights at chest level\n3. Press dumbbells up and slightly inward\n4. Squeeze chest at top of movement\n5. Lower with control to chest level\n6. Maintain stable base throughout',
    exerciseType: 'compound',
    primaryMuscles: ['Chest', 'Triceps'],
    secondaryMuscles: ['Shoulders'],
    difficulty: 250,
    progressionPath: 'beginner_to_intermediate'
  },
  {
    name: 'Lat Pulldowns',
    description: 'Vertical pulling exercise targeting the latissimus dorsi and other back muscles. Great for developing pulling strength.',
    instructions: '1. Sit at lat pulldown machine with thighs secured\n2. Grip bar wider than shoulder width\n3. Lean back slightly and engage core\n4. Pull bar down to upper chest\n5. Squeeze shoulder blades together\n6. Control the weight back to start',
    exerciseType: 'compound',
    primaryMuscles: ['Latissimus Dorsi', 'Rhomboids'],
    secondaryMuscles: ['Biceps', 'Rear Delts'],
    difficulty: 200,
    progressionPath: 'beginner_to_intermediate'
  },
  {
    name: 'Overhead Press',
    description: 'Vertical pressing movement targeting shoulders and core. Excellent for building overhead strength and stability.',
    instructions: '1. Stand with feet shoulder-width apart\n2. Hold barbell at shoulder level\n3. Engage core and glutes\n4. Press bar straight up overhead\n5. Keep head in neutral position\n6. Lower with control to shoulders',
    exerciseType: 'compound',
    primaryMuscles: ['Shoulders'],
    secondaryMuscles: ['Triceps', 'Core'],
    difficulty: 300,
    progressionPath: 'intermediate_to_advanced'
  },
  {
    name: 'Goblet Squat',
    description: 'Beginner-friendly squat variation using a dumbbell or kettlebell. Great for learning squat mechanics.',
    instructions: '1. Hold weight at chest level\n2. Stand with feet shoulder-width apart\n3. Keep chest up and core engaged\n4. Lower by sitting back into squat\n5. Keep knees tracking over toes\n6. Drive through heels to stand',
    exerciseType: 'compound',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Core', 'Calves'],
    difficulty: 150,
    progressionPath: 'beginner_to_intermediate'
  },
  {
    name: 'Romanian Deadlift',
    description: 'Hip-hinge movement emphasizing hamstrings and glutes. Excellent for posterior chain development.',
    instructions: '1. Hold barbell with overhand grip\n2. Stand with feet hip-width apart\n3. Hinge at hips while keeping knees soft\n4. Lower bar along legs to mid-shin\n5. Feel stretch in hamstrings\n6. Drive hips forward to return to start',
    exerciseType: 'compound',
    primaryMuscles: ['Hamstrings', 'Glutes'],
    secondaryMuscles: ['Erector Spinae', 'Core'],
    difficulty: 250,
    progressionPath: 'beginner_to_intermediate'
  },
  {
    name: 'Dumbbell Row',
    description: 'Horizontal pulling exercise targeting the middle back and biceps. Can be performed single-arm or bilateral.',
    instructions: '1. Hinge at hips with slight knee bend\n2. Hold dumbbells with arms extended\n3. Pull weights to lower ribs\n4. Squeeze shoulder blades together\n5. Control weight back to start\n6. Keep core engaged throughout',
    exerciseType: 'compound',
    primaryMuscles: ['Rhomboids', 'Middle Traps'],
    secondaryMuscles: ['Latissimus Dorsi', 'Biceps', 'Rear Delts'],
    difficulty: 200,
    progressionPath: 'beginner_to_intermediate'
  }
];

const seedExercises = async () => {
  try {
    logger.info('🌱 Starting exercise seeding...');
    
    // Initialize models cache first
    logger.info('🔧 Initializing models cache...');
    await initializeModelsCache();
    
    // Get models
    const models = await getAllModels();
    const Exercise = models.Exercise;
    
    if (!Exercise) {
      throw new Error('Exercise model not found');
    }
    
    // Check if exercises already exist
    const existingCount = await Exercise.count();
    if (existingCount > 0) {
      logger.info(`📚 Found ${existingCount} existing exercises. Skipping seed.`);
      return;
    }
    
    // Create exercises
    const createdExercises = await Exercise.bulkCreate(basicExercises);
    
    logger.info(`✅ Successfully seeded ${createdExercises.length} exercises:`);
    createdExercises.forEach(exercise => {
      logger.info(`   - ${exercise.name} (${exercise.exerciseType}, difficulty: ${exercise.difficulty})`);
    });
    
    logger.info('🎉 Exercise seeding completed successfully!');
    
  } catch (error) {
    logger.error('❌ Exercise seeding failed:', error);
    throw error;
  }
};

// Run seeding if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedExercises()
    .then(() => {
      logger.info('Exercise seeding process completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Exercise seeding process failed:', error);
      process.exit(1);
    });
}

export { seedExercises };
export default seedExercises;
