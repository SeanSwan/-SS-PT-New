/**
 * WorkoutSession Model (ORIGINAL MONGODB VERSION - BACKUP)
 * =======================================================
 * This is the original MongoDB/Mongoose version, backed up for reference.
 * The current WorkoutSession.mjs has been converted to PostgreSQL/Sequelize.
 */

import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Schema for a set within an exercise
const WorkoutSetSchema = new Schema({
  setNumber: {
    type: Number,
    required: true,
    min: 1
  },
  weight: {
    type: Number,
    required: true,
    min: 0
  },
  reps: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    default: ''
  }
});

// Schema for an exercise within a workout session
const SessionExerciseSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  muscleGroups: [String],
  sets: [WorkoutSetSchema]
});

// Main workout session schema
const WorkoutSessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  duration: {
    type: Number, // in minutes
    required: true,
    min: 0
  },
  intensity: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  exercises: [SessionExerciseSchema],
  notes: {
    type: String,
    default: ''
  },
  totalWeight: {
    type: Number,
    required: true,
    min: 0
  },
  totalReps: {
    type: Number,
    required: true,
    min: 0
  },
  totalSets: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Add index for performance
WorkoutSessionSchema.index({ userId: 1, date: -1 });

// Add method to calculate session stats
WorkoutSessionSchema.methods.calculateStats = function() {
  let totalWeight = 0;
  let totalReps = 0;
  let totalSets = 0;
  
  this.exercises.forEach(exercise => {
    exercise.sets.forEach(set => {
      totalWeight += set.weight * set.reps;
      totalReps += set.reps;
      totalSets++;
    });
  });
  
  this.totalWeight = totalWeight;
  this.totalReps = totalReps;
  this.totalSets = totalSets;
  
  return {
    totalWeight,
    totalReps,
    totalSets
  };
};

// Create and export the model
const WorkoutSession = model('WorkoutSession', WorkoutSessionSchema);
export default WorkoutSession;