import { Op } from 'sequelize';
import { getClientPainEntry } from '../../models/index.mjs';

const REGION_MUSCLE_MAP = {
  left_knee: ['quadriceps', 'hamstrings'],
  right_knee: ['quadriceps', 'hamstrings'],
  lower_back: ['erector_spinae', 'core', 'glutes'],
  upper_back: ['trapezius', 'rhomboids', 'lats'],
  left_shoulder: ['shoulders', 'chest'],
  right_shoulder: ['shoulders', 'chest'],
  left_hip: ['glutes', 'hip_flexors', 'adductors'],
  right_hip: ['glutes', 'hip_flexors', 'adductors'],
  left_ankle: ['calves', 'tibialis'],
  right_ankle: ['calves', 'tibialis'],
};

export async function collectBootcampPainAlerts({ trainerId, allExercises, explanations }) {
  const painAlerts = [];
  if (!trainerId) return painAlerts;

  try {
    const PainEntry = getClientPainEntry();
    const activeEntries = await PainEntry.findAll({
      where: { createdById: trainerId, status: 'active', painLevel: { [Op.gte]: 5 } },
      attributes: ['bodyRegion', 'side', 'painLevel', 'painType', 'userId'],
    });
    if (activeEntries.length === 0) return painAlerts;

    const painRegions = [...new Set(activeEntries.map(e => e.bodyRegion))];
    for (const region of painRegions) {
      const relatedMuscles = REGION_MUSCLE_MAP[region] || [];
      const flaggedExercises = allExercises.filter(ex => {
        const exMuscles = ex.muscleTargets?.toLowerCase() || '';
        return relatedMuscles.some(m => exMuscles.includes(m));
      });

      if (flaggedExercises.length > 0) {
        painAlerts.push({
          region,
          severity: Math.max(...activeEntries.filter(e => e.bodyRegion === region).map(e => e.painLevel)),
          flaggedExercises: flaggedExercises.map(e => e.exerciseName),
          recommendation: `Participants with ${region.replace(/_/g, ' ')} issues should use Board 2 joint-friendly alternatives or Board 3 low-impact swaps for these exercises.`,
        });
      }
    }

    if (painAlerts.length > 0) {
      explanations.push({
        type: 'pain_alert',
        message: `Pain-aware: ${painAlerts.length} exercise group(s) flagged based on active client injuries. Board 2 joint-friendly modifications and Board 3 low-impact swaps recommended.`,
      });
    }
  } catch {
    // Pain checks are non-fatal to class generation.
  }

  return painAlerts;
}
