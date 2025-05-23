/**
 * WorkoutPlan Model
 * ===============
 * Defines the schema for workout plans
 */

import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Schema for an exercise within a workout plan
const PlanExerciseSchema = new Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  sets: {
    type: Number,
    required: true,
    min: 1
  },
  reps: {
    type: String,
    required: true
  },
  rest: {
    type: Number,
    required: true,
    min: 0
  },
  notes: {
    type: String,
    default: ''
  }
});

// Schema for a day within a workout plan
const PlanDaySchema = new Schema({
  dayNumber: {
    type: Number,
    required: true,
    min: 1
  },
  title: {
    type: String,
    required: true
  },
  exercises: [PlanExerciseSchema]
});

// Main workout plan schema
const WorkoutPlanSchema = new Schema({
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
  description: {
    type: String,
    default: ''
  },
  durationWeeks: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'draft'],
    default: 'active'
  },
  tags: [String],
  days: [PlanDaySchema]
}, {
  timestamps: true
});

// Create and export the model
const WorkoutPlan = model('WorkoutPlan', WorkoutPlanSchema);
export default WorkoutPlan;
