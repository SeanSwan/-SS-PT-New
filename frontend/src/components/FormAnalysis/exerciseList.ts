/**
 * Shared exercise list for FormAnalyzer and UploadTab.
 * Centralized to avoid duplication (AI Village perf finding).
 */
import type { JointAngles } from '../../hooks/useBiomechanics';

export interface ExerciseDefinition {
  name: string;
  trackingJoint: keyof JointAngles;
}

export const EXERCISES: ExerciseDefinition[] = [
  { name: 'Squat', trackingJoint: 'leftKnee' },
  { name: 'Deadlift', trackingJoint: 'leftHip' },
  { name: 'Overhead Press', trackingJoint: 'leftShoulder' },
  { name: 'Bicep Curl', trackingJoint: 'leftElbow' },
  { name: 'Lunge', trackingJoint: 'rightKnee' },
  { name: 'Push-Up', trackingJoint: 'leftElbow' },
  { name: 'Bench Press', trackingJoint: 'leftElbow' },
  { name: 'Row', trackingJoint: 'leftElbow' },
  { name: 'Romanian Deadlift', trackingJoint: 'leftHip' },
  { name: 'Hip Thrust', trackingJoint: 'leftHip' },
  { name: 'Pull-Up', trackingJoint: 'leftElbow' },
  { name: 'Tricep Extension', trackingJoint: 'rightElbow' },
  { name: 'Lateral Raise', trackingJoint: 'leftShoulder' },
  { name: 'Front Raise', trackingJoint: 'leftShoulder' },
  { name: 'Plank', trackingJoint: 'leftHip' },
  { name: 'Leg Press', trackingJoint: 'leftKnee' },
  { name: 'Calf Raise', trackingJoint: 'leftAnkle' },
  { name: 'Face Pull', trackingJoint: 'leftShoulder' },
];

/** Just the exercise names for the upload tab */
export const EXERCISE_NAMES = EXERCISES.map(e => e.name);
