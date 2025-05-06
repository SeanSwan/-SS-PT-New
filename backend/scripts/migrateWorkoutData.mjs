/**
 * Workout Data Migration Utility
 * =============================
 * This script migrates data from the JSON fields in the old models
 * to the new normalized tables.
 * 
 * This should be run after creating the new tables but before removing
 * the JSON fields from the old tables.
 * 
 * Usage: node scripts/migrateWorkoutData.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import sequelize from '../database.mjs';
import '../models/associations.mjs';

// Get models
import Exercise from '../models/Exercise.mjs';
import WorkoutPlan from '../models/WorkoutPlan.mjs';
import WorkoutExercise from '../models/WorkoutExercise.mjs';
import Set from '../models/Set.mjs';
import MuscleGroup from '../models/MuscleGroup.mjs';
import ExerciseMuscleGroup from '../models/ExerciseMuscleGroup.mjs';
import Equipment from '../models/Equipment.mjs';
import ExerciseEquipment from '../models/ExerciseEquipment.mjs';
import WorkoutPlanDay from '../models/WorkoutPlanDay.mjs';
import WorkoutPlanDayExercise from '../models/WorkoutPlanDayExercise.mjs';

// Configure environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Define common muscle groups for seeding
const commonMuscleGroups = [
  { name: 'Quadriceps', shortName: 'Quads', bodyRegion: 'lower_body' },
  { name: 'Hamstrings', shortName: 'Hamstrings', bodyRegion: 'lower_body' },
  { name: 'Glutes', shortName: 'Glutes', bodyRegion: 'lower_body' },
  { name: 'Calves', shortName: 'Calves', bodyRegion: 'lower_body' },
  { name: 'Chest', shortName: 'Chest', bodyRegion: 'upper_body' },
  { name: 'Back', shortName: 'Back', bodyRegion: 'upper_body' },
  { name: 'Shoulders', shortName: 'Shoulders', bodyRegion: 'upper_body' },
  { name: 'Biceps', shortName: 'Biceps', bodyRegion: 'upper_body' },
  { name: 'Triceps', shortName: 'Triceps', bodyRegion: 'upper_body' },
  { name: 'Forearms', shortName: 'Forearms', bodyRegion: 'upper_body' },
  { name: 'Abdominals', shortName: 'Abs', bodyRegion: 'core' },
  { name: 'Obliques', shortName: 'Obliques', bodyRegion: 'core' },
  { name: 'Lower Back', shortName: 'Lower Back', bodyRegion: 'core' },
  { name: 'Trapezius', shortName: 'Traps', bodyRegion: 'upper_body' },
  { name: 'Latissimus Dorsi', shortName: 'Lats', bodyRegion: 'upper_body' }
];

// Define common equipment for seeding
const commonEquipment = [
  { name: 'Barbell', category: 'free_weight' },
  { name: 'Dumbbell', category: 'free_weight' },
  { name: 'Kettlebell', category: 'kettlebell' },
  { name: 'Resistance Band', category: 'resistance_band' },
  { name: 'Cable Machine', category: 'cable' },
  { name: 'Smith Machine', category: 'machine' },
  { name: 'Leg Press', category: 'machine' },
  { name: 'Lat Pulldown', category: 'cable' },
  { name: 'Bench', category: 'free_weight' },
  { name: 'Stability Ball', category: 'stability' },
  { name: 'Medicine Ball', category: 'medicine_ball' },
  { name: 'Foam Roller', category: 'other' },
  { name: 'Treadmill', category: 'cardio' },
  { name: 'Elliptical', category: 'cardio' },
  { name: 'Stationary Bike', category: 'cardio' }
];

/**
 * Migrates data from WorkoutExercise.setDetails to the new Set model
 */
async function migrateSetData() {
  console.log('Starting Sets migration...');
  const workoutExercises = await WorkoutExercise.findAll({
    attributes: ['id', 'setDetails']
  });

  let setCount = 0;
  const sets = [];

  for (const workoutExercise of workoutExercises) {
    // Skip if no setDetails or not an array
    if (!workoutExercise.setDetails || !Array.isArray(workoutExercise.setDetails)) {
      continue;
    }

    // Convert each set in setDetails to a new Set
    workoutExercise.setDetails.forEach((setDetail, index) => {
      // Create a new set record
      const newSet = {
        workoutExerciseId: workoutExercise.id,
        setNumber: index + 1,
        setType: setDetail.type || 'working',
        repsGoal: setDetail.repsGoal,
        repsCompleted: setDetail.repsCompleted,
        weightGoal: setDetail.weightGoal,
        weightUsed: setDetail.weightUsed,
        duration: setDetail.duration,
        distance: setDetail.distance,
        restGoal: setDetail.restGoal,
        restTaken: setDetail.restTaken,
        rpe: setDetail.rpe,
        tempo: setDetail.tempo,
        notes: setDetail.notes,
        isPR: setDetail.isPR || false,
        completedAt: setDetail.completedAt
      };
      
      sets.push(newSet);
      setCount++;
    });
  }

  // Bulk create all sets
  if (sets.length > 0) {
    await Set.bulkCreate(sets);
    console.log(`Migrated ${setCount} sets from ${workoutExercises.length} workout exercises.`);
  } else {
    console.log('No set data found to migrate.');
  }
}

/**
 * Seeds muscle groups and migrates exercise muscle data
 */
async function migrateMuscleData() {
  console.log('Starting muscle group migration...');
  
  // First, seed common muscle groups
  let muscleGroups = await MuscleGroup.findAll();
  
  if (muscleGroups.length === 0) {
    console.log('Seeding common muscle groups...');
    await MuscleGroup.bulkCreate(commonMuscleGroups);
    muscleGroups = await MuscleGroup.findAll();
    console.log(`Seeded ${muscleGroups.length} common muscle groups.`);
  }
  
  // Create a map of muscle group names to IDs for quick lookup
  const muscleGroupMap = {};
  muscleGroups.forEach(mg => {
    muscleGroupMap[mg.name.toLowerCase()] = mg.id;
  });
  
  // Get all exercises with muscle data
  const exercises = await Exercise.findAll({
    attributes: ['id', 'primaryMuscles', 'secondaryMuscles']
  });
  
  console.log(`Found ${exercises.length} exercises with potential muscle data.`);
  
  const exerciseMuscleGroups = [];
  let connectionCount = 0;
  
  // Process each exercise
  for (const exercise of exercises) {
    // Process primary muscles
    if (exercise.primaryMuscles && Array.isArray(exercise.primaryMuscles)) {
      exercise.primaryMuscles.forEach(muscle => {
        const muscleName = typeof muscle === 'string' ? muscle : muscle.name;
        if (!muscleName) return;
        
        // Find the muscle group ID
        const muscleId = muscleGroupMap[muscleName.toLowerCase()];
        
        if (muscleId) {
          exerciseMuscleGroups.push({
            exerciseId: exercise.id,
            muscleGroupId: muscleId,
            activationType: 'primary',
            activationLevel: 8
          });
          connectionCount++;
        }
      });
    }
    
    // Process secondary muscles
    if (exercise.secondaryMuscles && Array.isArray(exercise.secondaryMuscles)) {
      exercise.secondaryMuscles.forEach(muscle => {
        const muscleName = typeof muscle === 'string' ? muscle : muscle.name;
        if (!muscleName) return;
        
        // Find the muscle group ID
        const muscleId = muscleGroupMap[muscleName.toLowerCase()];
        
        if (muscleId) {
          exerciseMuscleGroups.push({
            exerciseId: exercise.id,
            muscleGroupId: muscleId,
            activationType: 'secondary',
            activationLevel: 4
          });
          connectionCount++;
        }
      });
    }
  }
  
  // Bulk create all exercise-muscle group relationships
  if (exerciseMuscleGroups.length > 0) {
    await ExerciseMuscleGroup.bulkCreate(exerciseMuscleGroups);
    console.log(`Created ${connectionCount} exercise-muscle group relationships.`);
  } else {
    console.log('No exercise-muscle group relationships to create.');
  }
}

/**
 * Seeds equipment and migrates exercise equipment data
 */
async function migrateEquipmentData() {
  console.log('Starting equipment migration...');
  
  // First, seed common equipment
  let equipmentItems = await Equipment.findAll();
  
  if (equipmentItems.length === 0) {
    console.log('Seeding common equipment...');
    await Equipment.bulkCreate(commonEquipment);
    equipmentItems = await Equipment.findAll();
    console.log(`Seeded ${equipmentItems.length} common equipment items.`);
  }
  
  // Create a map of equipment names to IDs for quick lookup
  const equipmentMap = {};
  equipmentItems.forEach(eq => {
    equipmentMap[eq.name.toLowerCase()] = eq.id;
  });
  
  // Get all exercises with equipment data
  const exercises = await Exercise.findAll({
    attributes: ['id', 'equipmentNeeded']
  });
  
  console.log(`Found ${exercises.length} exercises with potential equipment data.`);
  
  const exerciseEquipmentItems = [];
  let connectionCount = 0;
  
  // Process each exercise
  for (const exercise of exercises) {
    // Process equipment
    if (exercise.equipmentNeeded && Array.isArray(exercise.equipmentNeeded)) {
      exercise.equipmentNeeded.forEach(equipment => {
        const equipmentName = typeof equipment === 'string' ? equipment : equipment.name;
        if (!equipmentName) return;
        
        // Find the equipment ID
        const equipmentId = equipmentMap[equipmentName.toLowerCase()];
        
        if (equipmentId) {
          exerciseEquipmentItems.push({
            exerciseId: exercise.id,
            equipmentId: equipmentId,
            required: true
          });
          connectionCount++;
        }
      });
    }
  }
  
  // Bulk create all exercise-equipment relationships
  if (exerciseEquipmentItems.length > 0) {
    await ExerciseEquipment.bulkCreate(exerciseEquipmentItems);
    console.log(`Created ${connectionCount} exercise-equipment relationships.`);
  } else {
    console.log('No exercise-equipment relationships to create.');
  }
}

/**
 * Migrates workout plan structure to the new normalized tables
 */
async function migrateWorkoutPlanData() {
  console.log('Starting workout plan migration...');
  
  // Get all workout plans with structure data
  const workoutPlans = await WorkoutPlan.findAll({
    attributes: ['id', 'workoutStructure']
  });
  
  console.log(`Found ${workoutPlans.length} workout plans with potential structure data.`);
  
  let dayCount = 0;
  let exerciseCount = 0;
  
  // Process each workout plan
  for (const workoutPlan of workoutPlans) {
    // Skip if no workoutStructure or not an object
    if (!workoutPlan.workoutStructure || typeof workoutPlan.workoutStructure !== 'object') {
      continue;
    }
    
    // Process each day in the workout structure
    const structure = workoutPlan.workoutStructure;
    
    for (const dayKey in structure) {
      if (!structure.hasOwnProperty(dayKey)) continue;
      
      const day = structure[dayKey];
      const dayNumber = parseInt(dayKey.replace('day', ''), 10) || dayCount + 1;
      
      // Create the workout plan day
      const workoutPlanDay = await WorkoutPlanDay.create({
        workoutPlanId: workoutPlan.id,
        dayNumber: dayNumber,
        name: day.name || `Day ${dayNumber}`,
        focus: day.focus,
        dayType: day.type || 'training',
        optPhase: day.optPhase,
        notes: day.notes,
        warmupInstructions: day.warmup,
        cooldownInstructions: day.cooldown,
        estimatedDuration: day.duration,
        sortOrder: dayNumber
      });
      
      dayCount++;
      
      // Process each exercise in the day
      if (day.exercises && Array.isArray(day.exercises)) {
        for (let i = 0; i < day.exercises.length; i++) {
          const ex = day.exercises[i];
          
          // Skip if no exerciseId
          if (!ex.exerciseId) continue;
          
          // Create the workout plan day exercise
          await WorkoutPlanDayExercise.create({
            workoutPlanDayId: workoutPlanDay.id,
            exerciseId: ex.exerciseId,
            orderInWorkout: i + 1,
            setScheme: ex.sets,
            repGoal: ex.reps,
            restPeriod: ex.rest,
            tempo: ex.tempo,
            intensityGuideline: ex.intensity,
            supersetGroup: ex.supersetGroup,
            notes: ex.notes,
            isOptional: ex.optional || false,
            alternateExerciseId: ex.alternateExerciseId
          });
          
          exerciseCount++;
        }
      }
    }
  }
  
  console.log(`Migrated ${dayCount} workout plan days and ${exerciseCount} exercises.`);
}

/**
 * Main migration function
 */
async function migrateData() {
  try {
    console.log('Starting data migration process...');
    console.log('Testing database connection...');
    
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Run migrations in order
    await migrateMuscleData();
    await migrateEquipmentData();
    await migrateSetData();
    await migrateWorkoutPlanData();
    
    console.log('Data migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateData();